import { Router } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";
import { Coupon } from "../models/Coupon.js";

export const ordersRouter = Router();

const SHIPPING_FEE = 50; // EGP flat

ordersRouter.post("/", requireAuth, async (req, res) => {
  const { items, shippingAddress, couponCode } = req.body || {};
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

  let discount = 0;
  let appliedCode = "";
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim(), active: true });
    if (!coupon) return res.status(400).json({ message: "This coupon code is not valid" });
    if (subtotal < coupon.minSubtotal)
      return res.status(400).json({ message: `This code needs a subtotal of at least ${coupon.minSubtotal} EGP` });
    discount = Math.round(subtotal * coupon.percent / 100);
    appliedCode = coupon.code;
  }

  // Decrement stock conditionally so two simultaneous orders cannot
  // oversell the last units; roll back any earlier lines on failure.
  const decremented = [];
  for (const li of lineItems) {
    const result = await Product.updateOne(
      { _id: li.product, stock: { $gte: li.qty } },
      { $inc: { stock: -li.qty } }
    );
    if (result.modifiedCount === 0) {
      await Promise.all(decremented.map((d) =>
        Product.updateOne({ _id: d.product }, { $inc: { stock: d.qty } })));
      return res.status(409).json({ message: `Only just ran out of ${li.name}` });
    }
    decremented.push(li);
  }

  const order = await Order.create({
    user: req.user._id,
    items: lineItems,
    subtotal,
    discount,
    couponCode: appliedCode,
    shippingFee: SHIPPING_FEE,
    total: subtotal - discount + SHIPPING_FEE,
    shippingAddress,
  });
  res.status(201).json({ order });
});

ordersRouter.get("/mine", requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
});

ordersRouter.get("/mine/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid order id" });
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});

const CUSTOMER_CANCELLABLE = ["pending", "confirmed"];

ordersRouter.post("/mine/:id/cancel", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid order id" });
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!CUSTOMER_CANCELLABLE.includes(order.status))
    return res.status(409).json({ message: `An order that is ${order.status} can no longer be cancelled` });

  await Promise.all(order.items.map((li) =>
    Product.updateOne({ _id: li.product }, { $inc: { stock: li.qty } })));
  order.status = "cancelled";
  await order.save();
  res.json({ order });
});
