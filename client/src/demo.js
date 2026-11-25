// Offline demo adapter: when the API is unreachable the client runs against
// browser-local demo data so the hosted preview still works end to end.
// The real backend in /server implements the same endpoints with MongoDB.

const PRODUCTS = [
  { _id: "d1", name: "Anker Soundcore R50i Earbuds", slug: "anker-soundcore-r50i-earbuds", category: "Electronics", price: 1299, stock: 24, rating: 4.5, imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80", description: "True wireless earbuds with 10mm drivers, 30 hours of playtime with the case, and AI-enhanced calls." },
  { _id: "d2", name: "Xiaomi Redmi Watch 4", slug: "xiaomi-redmi-watch-4", category: "Electronics", price: 3499, stock: 12, rating: 4.3, imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80", description: "1.97 inch AMOLED display smartwatch with 18-day battery life, GPS, and 150+ sport modes." },
  { _id: "d3", name: "Logitech K380 Keyboard", slug: "logitech-k380-keyboard", category: "Electronics", price: 1850, stock: 30, rating: 4.7, imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80", description: "Compact multi-device Bluetooth keyboard. Pair with up to three devices and switch with one tap." },
  { _id: "d4", name: "Cotton Oversized T-Shirt - Sand", slug: "cotton-oversized-t-shirt-sand", category: "Fashion", price: 450, stock: 60, rating: 4.2, imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80", description: "240gsm Egyptian cotton tee with a relaxed fit. Pre-shrunk and garment dyed." },
  { _id: "d5", name: "Canvas Tote Bag", slug: "canvas-tote-bag", category: "Fashion", price: 275, stock: 45, rating: 4.0, imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80", description: "12oz natural canvas tote with an inner pocket. Fits a 15 inch laptop." },
  { _id: "d6", name: "Ceramic Pour-Over Coffee Set", slug: "ceramic-pour-over-coffee-set", category: "Home", price: 980, stock: 15, rating: 4.6, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80", description: "Hand-glazed ceramic dripper with a 600ml carafe. Brews two generous cups." },
  { _id: "d7", name: "Stainless Steel Water Bottle 750ml", slug: "stainless-steel-water-bottle-750ml", category: "Home", price: 520, stock: 80, rating: 4.4, imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80", description: "Double-wall insulated bottle. Keeps drinks cold 24 hours or hot 12." },
  { _id: "d8", name: "Desk Lamp with Wireless Charger", slug: "desk-lamp-with-wireless-charger", category: "Home", price: 1150, stock: 18, rating: 4.1, imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80", description: "Dimmable LED desk lamp with a 15W wireless charging pad built into the base." },
  { _id: "d9", name: "Atomic Habits - James Clear", slug: "atomic-habits-james-clear", category: "Books", price: 320, stock: 40, rating: 4.8, imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80", description: "The practical guide to building good habits and breaking bad ones. English paperback edition." },
  { _id: "d10", name: "Clean Code - Robert C. Martin", slug: "clean-code-robert-c-martin", category: "Books", price: 540, stock: 22, rating: 4.6, imageUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80", description: "A handbook of agile software craftsmanship every developer should read once." },
  { _id: "d11", name: "Mechanical Pencil Set (5 pcs)", slug: "mechanical-pencil-set-5-pcs", category: "Stationery", price: 145, stock: 100, rating: 4.0, imageUrl: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&q=80", description: "0.5 and 0.7mm drafting pencils with refill leads and erasers." },
  { _id: "d12", name: "Hardcover Dotted Notebook A5", slug: "hardcover-dotted-notebook-a5", category: "Stationery", price: 210, stock: 55, rating: 4.3, imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80", description: "160 pages of 100gsm dotted paper with numbered pages and an elastic closure." },
];

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function demoApi(path, { method = "GET", body } = {}) {
  const users = load("souq_demo_users", []);
  const me = users.find((u) => u.token === localStorage.getItem("souq_token"));

  if (path === "/auth/register" && method === "POST") {
    if (!body.name || !body.email || !body.password) throw new Error("Name, email and password are required");
    if (body.password.length < 8) throw new Error("Password must be at least 8 characters");
    if (users.some((u) => u.email === body.email.toLowerCase())) throw new Error("An account with this email already exists");
    const user = { id: "u" + Date.now(), name: body.name, email: body.email.toLowerCase(), role: "customer", token: "demo-" + Date.now() };
    users.push({ ...user, password: body.password });
    save("souq_demo_users", users);
    return Promise.resolve({ token: user.token, user });
  }
  if (path === "/auth/login" && method === "POST") {
    const user = users.find((u) => u.email === (body.email || "").toLowerCase() && u.password === body.password);
    if (!user) throw new Error("Wrong email or password");
    const { password, ...pub } = user;
    return Promise.resolve({ token: pub.token, user: pub });
  }
  if (path === "/auth/me" && method === "PATCH") {
    if (!me) throw new Error("Authentication required");
    if (body.name != null) {
      if (!String(body.name).trim()) throw new Error("Name cannot be empty");
      me.name = String(body.name).trim();
    }
    if (body.address != null) me.address = {
      city: String(body.address.city || ""), street: String(body.address.street || ""), phone: String(body.address.phone || ""),
    };
    save("souq_demo_users", users);
    const { password, ...pub } = me;
    return Promise.resolve({ user: pub });
  }
  if (path === "/auth/me") {
    if (!me) throw new Error("Authentication required");
    const { password, ...pub } = me;
    return Promise.resolve({ user: pub });
  }
  if (path === "/products/categories") return Promise.resolve({ categories: [...new Set(PRODUCTS.map((p) => p.category))] });

  const productMatch = path.match(/^\/products\/([^?]+)$/);
  if (productMatch) {
    const product = PRODUCTS.find((p) => p.slug === productMatch[1]);
    if (!product) throw new Error("Product not found");
    return Promise.resolve({ product });
  }
  if (path.startsWith("/products")) {
    const params = new URLSearchParams(path.split("?")[1] || "");
    let items = [...PRODUCTS];
    if (params.get("category")) items = items.filter((p) => p.category === params.get("category"));
    if (params.get("q")) { const q = params.get("q").toLowerCase(); items = items.filter((p) => (p.name + p.description).toLowerCase().includes(q)); }
    const sorts = { price_asc: (a, b) => a.price - b.price, price_desc: (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating };
    if (sorts[params.get("sort")]) items.sort(sorts[params.get("sort")]);
    return Promise.resolve({ items, total: items.length, page: 1, pages: 1 });
  }
  if (path === "/orders" && method === "POST") {
    if (!me) throw new Error("Authentication required");
    if (!body.shippingAddress?.city || !body.shippingAddress?.street || !body.shippingAddress?.phone)
      throw new Error("City, street and phone are required");
    const items = (body.items || []).map((i) => {
      const p = PRODUCTS.find((x) => x._id === i.productId);
      if (!p) throw new Error("A product in the order no longer exists");
      return { product: p._id, name: p.name, price: p.price, qty: Math.max(1, i.qty | 0) };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orders = load("souq_demo_orders", []);
    const order = { _id: "o" + Date.now(), user: me.id, items, subtotal, shippingFee: 50, total: subtotal + 50, status: "pending", shippingAddress: body.shippingAddress, createdAt: new Date().toISOString() };
    orders.unshift(order);
    save("souq_demo_orders", orders);
    return Promise.resolve({ order });
  }
  if (path === "/orders/mine") {
    if (!me) throw new Error("Authentication required");
    return Promise.resolve({ orders: load("souq_demo_orders", []).filter((o) => o.user === me.id) });
  }
  const mineMatch = path.match(/^\/orders\/mine\/([^/]+)(\/cancel)?$/);
  if (mineMatch) {
    if (!me) throw new Error("Authentication required");
    const orders = load("souq_demo_orders", []);
    const order = orders.find((o) => o._id === mineMatch[1] && o.user === me.id);
    if (!order) throw new Error("Order not found");
    if (mineMatch[2]) {
      if (!["pending", "confirmed"].includes(order.status))
        throw new Error(`An order that is ${order.status} can no longer be cancelled`);
      order.status = "cancelled";
      save("souq_demo_orders", orders);
    }
    return Promise.resolve({ order });
  }
  throw new Error("Not found");
    }
