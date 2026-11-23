import { Router } from "express";
import { Product } from "../models/Product.js";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  const { q, category, featured, sort = "newest", page = 1, limit = 12 } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (featured === "true") filter.featured = true;
  if (q) filter.$text = { $search: q };
  const sortMap = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, rating: { rating: -1 } };
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(48, Math.max(1, Number(limit) || 12));
  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortMap[sort] || sortMap.newest).skip((pageNum - 1) * perPage).limit(perPage),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page: pageNum, pages: Math.ceil(total / perPage) });
});

productsRouter.get("/categories", async (_req, res) => {
  res.json({ categories: await Product.distinct("category") });
});

productsRouter.get("/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ product });
});
