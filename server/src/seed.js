import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { Product } from "./models/Product.js";
import { User } from "./models/User.js";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const products = [
  { name: "Anker Soundcore R50i Earbuds", category: "Electronics", price: 1299, stock: 24, rating: 4.5, featured: true, imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80", description: "True wireless earbuds with 10mm drivers, 30 hours of playtime with the case, and AI-enhanced calls." },
  { name: "Xiaomi Redmi Watch 4", category: "Electronics", price: 3499, stock: 12, rating: 4.3, featured: true, imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80", description: "1.97 inch AMOLED display smartwatch with 18-day battery life, GPS, and 150+ sport modes." },
  { name: "Logitech K380 Keyboard", category: "Electronics", price: 1850, stock: 30, rating: 4.7, imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80", description: "Compact multi-device Bluetooth keyboard. Pair with up to three devices and switch with one tap." },
  { name: "Cotton Oversized T-Shirt - Sand", category: "Fashion", price: 450, stock: 60, rating: 4.2, imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80", description: "240gsm Egyptian cotton tee with a relaxed fit. Pre-shrunk and garment dyed." },
  { name: "Canvas Tote Bag", category: "Fashion", price: 275, stock: 45, rating: 4.0, imageUrl: "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?w=800&q=80", description: "12oz natural canvas tote with an inner pocket. Fits a 15 inch laptop." },
  { name: "Ceramic Pour-Over Coffee Set", category: "Home", price: 980, stock: 15, rating: 4.6, featured: true, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80", description: "Hand-glazed ceramic dripper with a 600ml carafe. Brews two generous cups." },
  { name: "Stainless Steel Water Bottle 750ml", category: "Home", price: 520, stock: 80, rating: 4.4, imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80", description: "Double-wall insulated bottle. Keeps drinks cold 24 hours or hot 12." },
  { name: "Desk Lamp with Wireless Charger", category: "Home", price: 1150, stock: 18, rating: 4.1, imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80", description: "Dimmable LED desk lamp with a 15W wireless charging pad built into the base." },
  { name: "Atomic Habits - James Clear", category: "Books", price: 320, stock: 40, rating: 4.8, featured: true, imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80", description: "The practical guide to building good habits and breaking bad ones. English paperback edition." },
  { name: "Clean Code - Robert C. Martin", category: "Books", price: 540, stock: 22, rating: 4.6, imageUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80", description: "A handbook of agile software craftsmanship every developer should read once." },
  { name: "Mechanical Pencil Set (5 pcs)", category: "Stationery", price: 145, stock: 100, rating: 4.0, imageUrl: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&q=80", description: "0.5 and 0.7mm drafting pencils with refill leads and erasers." },
  { name: "Hardcover Dotted Notebook A5", category: "Stationery", price: 210, stock: 55, rating: 4.3, imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80", description: "160 pages of 100gsm dotted paper with numbered pages and an elastic closure." },
].map((p) => ({ ...p, slug: slug(p.name) }));

await connectDB();
await Product.deleteMany({});
await Product.insertMany(products);

const adminEmail = "admin@souq.local";
await User.deleteOne({ email: adminEmail });
await User.create({ name: "Store Admin", email: adminEmail, passwordHash: await User.hashPassword("admin12345"), role: "admin" });

console.log(`Seeded ${products.length} products and admin account (${adminEmail})`);
await mongoose.disconnect();
