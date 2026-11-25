import { Router } from "express";
import { User } from "../models/User.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, address: u.address });

authRouter.post("/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: "An account with this email already exists" });
  const user = await User.create({ name, email, passwordHash: await User.hashPassword(password) });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.checkPassword(password)))
    return res.status(401).json({ message: "Wrong email or password" });
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

authRouter.patch("/me", requireAuth, async (req, res) => {
  const { name, address } = req.body || {};
  if (name != null) {
    if (!String(name).trim()) return res.status(400).json({ message: "Name cannot be empty" });
    req.user.name = String(name).trim();
  }
  if (address != null) {
    req.user.address = {
      city: String(address.city || "").trim(),
      street: String(address.street || "").trim(),
      phone: String(address.phone || "").trim(),
    };
  }
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
