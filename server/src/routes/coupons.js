import { Router } from "express";
import { Coupon } from "../models/Coupon.js";
import { requireAuth } from "../middleware/auth.js";

export const couponsRouter = Router();

// Live check while the customer types a code at checkout. The order route
// re-validates server-side at placement time; this is only feedback.
couponsRouter.post("/validate", requireAuth, async (req, res) => {
  const { code, subtotal } = req.body || {};
  if (!code) return res.status(400).json({ message: "A coupon code is required" });
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim(), active: true });
  if (!coupon) return res.status(404).json({ message: "This code is not valid" });
  const sub = Number(subtotal) || 0;
  if (sub < coupon.minSubtotal)
    return res.status(400).json({ message: `This code needs a subtotal of at least ${coupon.minSubtotal} EGP` });
  res.json({ code: coupon.code, percent: coupon.percent, discount: Math.round(sub * coupon.percent / 100) });
});
