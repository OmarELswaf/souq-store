import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Product } from "../models/Product.js";

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);

wishlistRouter.get("/", async (req, res) => {
  await req.user.populate("wishlist");
  res.json({ products: req.user.wishlist });
});

wishlistRouter.post("/:productId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId))
    return res.status(400).json({ message: "Invalid product id" });
  const product = await Product.findById(req.params.productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const id = product._id.toString();
  const has = req.user.wishlist.some((w) => w.toString() === id);
  req.user.wishlist = has
    ? req.user.wishlist.filter((w) => w.toString() !== id)
    : [...req.user.wishlist, product._id];
  await req.user.save();
  res.json({ inWishlist: !has });
});
