import { Router } from "express";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { requireAuth } from "../middleware/auth.js";

async function recalcRating(productId) {
  const [agg] = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, {
    rating: agg ? Math.round(agg.avg * 10) / 10 : 0,
    numReviews: agg?.count || 0,
  });
}

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

productsRouter.get("/:slug/reviews", async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ message: "Product not found" });
  const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ reviews });
});

productsRouter.post("/:slug/reviews", requireAuth, async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ message: "Product not found" });
  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || "").trim().slice(0, 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: req.user._id },
    { rating, comment, name: req.user.name },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await recalcRating(product._id);
  res.status(201).json({ review });
});

productsRouter.delete("/:slug/reviews/mine", requireAuth, async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ message: "Product not found" });
  const deleted = await Review.findOneAndDelete({ product: product._id, user: req.user._id });
  if (!deleted) return res.status(404).json({ message: "You have not reviewed this product" });
  await recalcRating(product._id);
  res.json({ deleted: true });
});
