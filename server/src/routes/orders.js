import { Router } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";

export const ordersRouter = Router();

const SHIPPING_FEE = 50; // EGP flat

ordersRouter.post("/", requireAuth, async (req, res) => {
  const { items, shippingAddress } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "Order must contain at least one item" });
  if (!shippingAddress?.city || !shippingAddress?.street || !shippingAddress?.phone)
    return res.status(400).json({ message: "City, street and phone are required" });

  const ids = items.map((i) => i.productId);
  if (ids.some((id) => !mongoose.isValidObjectId(id)))
    return res.status(400).json({ message: "Invalid product id" });
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lineItems = [];
  let subtotal = 0;
  for (const item of items) {
    const product = byId.get(String(item.productId));
    const qty = Math.max(1, Number(item.qty) || 1);
    if (!product) return res.status(400).json({ message: "A product in the order no longer exists" });
    if (product.stock < qty)
      return res.status(409).json({ message: `Only ${product.stock} left of ${product.name}` });
    subtotal += product.price * qty;
    lineItems.push({ product: product._id, name: product.name, price: product.price, qty });
  }

  await Promise.all(lineItems.map((li) => Product.updateOne({ _id: li.product }, { $inc: { stock: -li.qty } })));

  const order = await Order.create({
    user: req.user._id,
    items: lineItems,
    subtotal,
    shippingFee: SHIPPING_FEE,
    total: subtotal + SHIPPING_FEE,
    shippingAddress,
  });
  res.status(201).json({ order });
});

ordersRouter.get("/mine", requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
});
