import { Router } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { Coupon } from "../models/Coupon.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { slugify } from "../utils/slug.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

const isValidId = (id) => mongoose.isValidObjectId(id);

// ---------- Products ----------

adminRouter.post("/products", async (req, res) => {
  const { name, description, category, price, stock = 0, imageUrl = "", featured = false } = req.body || {};
  if (!name || !description || !category || price == null)
    return res.status(400).json({ message: "Name, description, category and price are required" });
  if (Number(price) < 0 || Number(stock) < 0)
    return res.status(400).json({ message: "Price and stock cannot be negative" });

  let slug = slugify(name);
  const clash = await Product.findOne({ slug });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const product = await Product.create({
    name, slug, description, category,
    price: Number(price), stock: Number(stock), imageUrl, featured: Boolean(featured),
  });
  res.status(201).json({ product });
});

adminRouter.patch("/products/:id", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid product id" });
  const allowed = ["name", "description", "category", "price", "stock", "imageUrl", "featured"];
  const updates = {};
  for (const key of allowed) if (key in (req.body || {})) updates[key] = req.body[key];
  if ("price" in updates && Number(updates.price) < 0)
    return res.status(400).json({ message: "Price cannot be negative" });
  if ("stock" in updates && Number(updates.stock) < 0)
    return res.status(400).json({ message: "Stock cannot be negative" });

  const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ product });
});

adminRouter.delete("/products/:id", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid product id" });
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ deleted: true, id: req.params.id });
});

// ---------- Orders ----------

const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

adminRouter.get("/orders", async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 20));
  const [orders, total] = await Promise.all([
    Order.find(filter).populate("user", "name email").sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage).limit(perPage),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, total, page: pageNum, pages: Math.ceil(total / perPage) });
});

adminRouter.get("/orders/:id", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid order id" });
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});

adminRouter.patch("/orders/:id/status", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid order id" });
  const { status } = req.body || {};
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!TRANSITIONS[order.status]?.includes(status))
    return res.status(409).json({
      message: `Cannot move an order from ${order.status} to ${status}`,
      allowed: TRANSITIONS[order.status],
    });

  if (status === "cancelled") {
    await Promise.all(order.items.map((li) =>
      Product.updateOne({ _id: li.product }, { $inc: { stock: li.qty } })));
  }
  order.status = status;
  await order.save();
  res.json({ order });
});

// ---------- Stats ----------

adminRouter.get("/stats", async (_req, res) => {
  const [ordersByStatus, revenueRow, productCount, userCount, lowStock] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]),
    Product.countDocuments(),
    User.countDocuments({ role: "customer" }),
    Product.find({ stock: { $lte: 5 } }).select("name slug stock").sort({ stock: 1 }).limit(10),
  ]);
  const statuses = Object.fromEntries(ordersByStatus.map((s) => [s._id, s.count]));
  res.json({
    revenue: revenueRow[0]?.revenue || 0,
    activeOrders: revenueRow[0]?.orders || 0,
    ordersByStatus: statuses,
    productCount,
    customerCount: userCount,
    lowStock,
  });
});

// ---------- Coupons ----------

adminRouter.get("/coupons", async (_req, res) => {
  res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }) });
});

adminRouter.post("/coupons", async (req, res) => {
  const { code, percent, minSubtotal = 0 } = req.body || {};
  const pct = Number(percent);
  if (!code || !String(code).trim()) return res.status(400).json({ message: "A code is required" });
  if (!Number.isFinite(pct) || pct < 1 || pct > 100)
    return res.status(400).json({ message: "Percent must be between 1 and 100" });
  const exists = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  if (exists) return res.status(409).json({ message: "That code already exists" });
  const coupon = await Coupon.create({ code: String(code).toUpperCase().trim(), percent: pct, minSubtotal: Number(minSubtotal) || 0 });
  res.status(201).json({ coupon });
});

adminRouter.patch("/coupons/:id", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid coupon id" });
  const updates = {};
  for (const key of ["percent", "minSubtotal", "active"]) if (key in (req.body || {})) updates[key] = req.body[key];
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ coupon });
});

// ---------- Users ----------

adminRouter.get("/users", async (_req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 }).limit(200);
  res.json({ users });
});
