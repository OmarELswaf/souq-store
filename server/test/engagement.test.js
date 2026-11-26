import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/Product.js";
import { User } from "../src/models/User.js";
import { Coupon } from "../src/models/Coupon.js";

process.env.JWT_SECRET = "test-secret";

let mongod, app, adminToken, customerToken, product;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  product = await Product.create({
    name: "Review Lamp", slug: "review-lamp", description: "A lamp to review",
    category: "Home", price: 400, stock: 10, rating: 0,
  });
  await Coupon.create({ code: "SAVE25", percent: 25, minSubtotal: 500 });
  await User.create({ name: "Admin", email: "admin@example.com",
    passwordHash: await User.hashPassword("adminpass1"), role: "admin" });
  adminToken = (await request(app).post("/api/auth/login")
    .send({ email: "admin@example.com", password: "adminpass1" })).body.token;
  customerToken = (await request(app).post("/api/auth/register")
    .send({ name: "Rana", email: "rana@example.com", password: "password123" })).body.token;
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const asAdmin = (r) => r.set("Authorization", `Bearer ${adminToken}`);
const asCustomer = (r) => r.set("Authorization", `Bearer ${customerToken}`);
const address = { city: "Cairo", street: "1 Test St", phone: "01000000000" };

test("a signed-in customer posts a review and the rating recalculates", async () => {
  const res = await asCustomer(request(app).post("/api/products/review-lamp/reviews"))
    .send({ rating: 5, comment: "Great lamp" });
  assert.equal(res.status, 201);

  const listed = await request(app).get("/api/products/review-lamp/reviews");
  assert.equal(listed.body.reviews.length, 1);
  assert.equal(listed.body.reviews[0].name, "Rana");

  const updated = await Product.findById(product.id);
  assert.equal(updated.rating, 5);
  assert.equal(updated.numReviews, 1);
});

test("a second review from the same account replaces the first", async () => {
  const res = await asCustomer(request(app).post("/api/products/review-lamp/reviews"))
    .send({ rating: 3, comment: "Changed my mind" });
  assert.equal(res.status, 201);
  const listed = await request(app).get("/api/products/review-lamp/reviews");
  assert.equal(listed.body.reviews.length, 1);
  assert.equal(listed.body.reviews[0].rating, 3);
  const updated = await Product.findById(product.id);
  assert.equal(updated.rating, 3);
});

test("reviews reject bad ratings and anonymous posts", async () => {
  assert.equal((await asCustomer(request(app).post("/api/products/review-lamp/reviews")).send({ rating: 9 })).status, 400);
  assert.equal((await request(app).post("/api/products/review-lamp/reviews").send({ rating: 5 })).status, 401);
});

test("deleting a review resets the rating", async () => {
  const res = await asCustomer(request(app).delete("/api/products/review-lamp/reviews/mine"));
  assert.equal(res.status, 200);
  const updated = await Product.findById(product.id);
  assert.equal(updated.rating, 0);
  assert.equal(updated.numReviews, 0);
});

test("wishlist toggles a product on and off", async () => {
  const on = await asCustomer(request(app).post(`/api/wishlist/${product.id}`));
  assert.equal(on.body.inWishlist, true);
  const list = await asCustomer(request(app).get("/api/wishlist"));
  assert.equal(list.body.products.length, 1);
  assert.equal(list.body.products[0].slug, "review-lamp");
  const off = await asCustomer(request(app).post(`/api/wishlist/${product.id}`));
  assert.equal(off.body.inWishlist, false);
});

test("wishlist requires sign-in", async () => {
  assert.equal((await request(app).get("/api/wishlist")).status, 401);
});

test("a coupon discount is priced by the server on the order", async () => {
  const res = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 2 }], shippingAddress: address, couponCode: "save25" });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.subtotal, 800);
  assert.equal(res.body.order.discount, 200);
  assert.equal(res.body.order.total, 800 - 200 + 50);
  assert.equal(res.body.order.couponCode, "SAVE25");
});

test("coupons below the minimum subtotal and unknown codes are rejected", async () => {
  const low = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 1 }], shippingAddress: address, couponCode: "SAVE25" });
  assert.equal(low.status, 400);
  const unknown = await asCustomer(request(app).post("/api/orders"))
    .send({ items: [{ productId: product.id, qty: 1 }], shippingAddress: address, couponCode: "NOPE" });
  assert.equal(unknown.status, 400);
});

test("coupon validation endpoint gives live feedback", async () => {
  const ok = await asCustomer(request(app).post("/api/coupons/validate"))
    .send({ code: "SAVE25", subtotal: 1000 });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.discount, 250);
  const bad = await asCustomer(request(app).post("/api/coupons/validate"))
    .send({ code: "SAVE25", subtotal: 100 });
  assert.equal(bad.status, 400);
});

test("admin manages coupons and customers cannot", async () => {
  const created = await asAdmin(request(app).post("/api/admin/coupons"))
    .send({ code: "vip50", percent: 50 });
  assert.equal(created.status, 201);
  assert.equal(created.body.coupon.code, "VIP50");
  const dup = await asAdmin(request(app).post("/api/admin/coupons"))
    .send({ code: "VIP50", percent: 10 });
  assert.equal(dup.status, 409);
  const off = await asAdmin(request(app).patch(`/api/admin/coupons/${created.body.coupon._id}`))
    .send({ active: false });
  assert.equal(off.body.coupon.active, false);
  assert.equal((await asCustomer(request(app).get("/api/admin/coupons"))).status, 403);
});
