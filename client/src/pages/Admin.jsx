import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, isDemoMode } from "../api.js";
import { useStore } from "../store.jsx";

const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function Stats() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api("/admin/stats").then(setStats); }, []);
  if (!stats) return <p className="muted">Loading...</p>;
  const cards = [
    ["Revenue", `${stats.revenue.toLocaleString()} EGP`],
    ["Active orders", stats.activeOrders],
    ["Products", stats.productCount],
    ["Customers", stats.customerCount],
  ];
  return (
    <>
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <div className="stat-card" key={label}><span className="muted small">{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <h3>Orders by status</h3>
      <div className="chips">
        {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
          <span key={s} className={`status ${s}`}>{s}: {stats.ordersByStatus[s] || 0}</span>
        ))}
      </div>
      <h3>Low stock</h3>
      {stats.lowStock.length === 0 ? <p className="muted">Nothing running low.</p> : (
        <table className="table">
          <thead><tr><th>Product</th><th>Stock</th></tr></thead>
          <tbody>
            {stats.lowStock.map((p) => (
              <tr key={p._id} className={p.stock === 0 ? "row-out" : ""}>
                <td>{p.name}</td><td>{p.stock === 0 ? "Sold out" : p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

const EMPTY_PRODUCT = { name: "", description: "", category: "", price: "", stock: "", imageUrl: "", featured: false };

function Products() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [form, setForm] = useState(null); // null = closed, object = editing/creating
  const [error, setError] = useState("");
  const { toast } = useStore();

  const load = () => api("/products?limit=48").then(setData);
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      if (form._id) {
        await api(`/admin/products/${form._id}`, { method: "PATCH", body });
        toast("Product updated");
      } else {
        await api("/admin/products", { method: "POST", body });
        toast("Product created");
      }
      setForm(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    await api(`/admin/products/${p._id}`, { method: "DELETE" });
    toast("Product deleted");
    load();
  };

  return (
    <>
      <div className="admin-bar">
        <h3>Products ({data.total})</h3>
        <button className="btn-primary" onClick={() => setForm({ ...EMPTY_PRODUCT })}>+ New product</button>
      </div>
      {form && (
        <form className="form panel" onSubmit={save}>
          <h4>{form._id ? `Edit ${form.name}` : "New product"}</h4>
          <label>Name<input value={form.name} onChange={set("name")} required /></label>
          <label>Description<textarea rows="3" value={form.description} onChange={set("description")} required /></label>
          <div className="form-row">
            <label>Category<input value={form.category} onChange={set("category")} required /></label>
            <label>Price (EGP)<input type="number" min="0" value={form.price} onChange={set("price")} required /></label>
            <label>Stock<input type="number" min="0" value={form.stock} onChange={set("stock")} required /></label>
          </div>
          <label>Image URL<input value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://..." /></label>
          <label className="check"><input type="checkbox" checked={form.featured} onChange={set("featured")} /> Featured</label>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button className="btn-primary" type="submit">Save</button>
            <button className="btn-ghost" type="button" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}
      <table className="table">
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          {data.items.map((p) => (
            <tr key={p._id} className={p.stock === 0 ? "row-out" : ""}>
              <td>{p.name}{p.featured && <span className="chip-mini"> featured</span>}</td>
              <td>{p.category}</td>
              <td>{p.price.toLocaleString()}</td>
              <td>{p.stock}</td>
              <td className="row-actions">
                <button className="link" onClick={() => setForm({ ...p })}>Edit</button>
                <button className="link danger" onClick={() => remove(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Orders() {
  const [data, setData] = useState({ orders: [], total: 0 });
  const [status, setStatus] = useState("");
  const { toast } = useStore();

  const load = (s = status) => api(`/admin/orders${s ? `?status=${s}` : ""}`).then(setData);
  useEffect(() => { load(status); }, [status]);

  const move = async (order, next) => {
    try {
      await api(`/admin/orders/${order._id}/status`, { method: "PATCH", body: { status: next } });
      toast(`Order ${next}`);
      load();
    } catch (e) { toast(e.message); }
  };

  return (
    <>
      <div className="admin-bar">
        <h3>Orders ({data.total})</h3>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {data.orders.length === 0 ? <p className="muted">No orders here yet.</p> : data.orders.map((o) => (
        <div className="order" key={o._id}>
          <div className="order-head">
            <span>#{o._id.slice(-6).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString()}</span>
            <span className={`status ${o.status}`}>{o.status}</span>
            <strong>{o.total.toLocaleString()} EGP</strong>
          </div>
          <p className="muted">
            {o.user?.name || "Customer"} ({o.user?.email || "no email"}) · {o.shippingAddress.city}, {o.shippingAddress.street} · {o.shippingAddress.phone}
          </p>
          <p className="muted">{o.items.map((i) => `${i.name} x${i.qty}`).join(", ")}</p>
          {NEXT_STATUS[o.status]?.length > 0 && (
            <div className="row-actions">
              {NEXT_STATUS[o.status].map((s) => (
                <button key={s} className={s === "cancelled" ? "btn-ghost danger" : "btn-ghost"} onClick={() => move(o, s)}>
                  Mark {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", percent: "", minSubtotal: "" });
  const [error, setError] = useState("");
  const { toast } = useStore();

  const load = () => api("/admin/coupons").then((d) => setCoupons(d.coupons));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/admin/coupons", { method: "POST", body: {
        code: form.code, percent: Number(form.percent), minSubtotal: Number(form.minSubtotal) || 0,
      }});
      toast("Coupon created");
      setForm({ code: "", percent: "", minSubtotal: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const toggle = async (c) => {
    await api(`/admin/coupons/${c._id}`, { method: "PATCH", body: { active: !c.active } });
    load();
  };

  return (
    <>
      <form className="form panel" onSubmit={create}>
        <h4>New coupon</h4>
        <div className="form-row">
          <label>Code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="WELCOME10" /></label>
          <label>Percent off<input type="number" min="1" max="100" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} required /></label>
          <label>Min subtotal (EGP)<input type="number" min="0" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} placeholder="0" /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions"><button className="btn-primary" type="submit">Create</button></div>
      </form>
      <table className="table">
        <thead><tr><th>Code</th><th>Discount</th><th>Min subtotal</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c._id}>
              <td><strong>{c.code}</strong></td>
              <td>{c.percent}%</td>
              <td>{c.minSubtotal ? `${c.minSubtotal.toLocaleString()} EGP` : "-"}</td>
              <td><span className={`status ${c.active ? "delivered" : "cancelled"}`}>{c.active ? "active" : "off"}</span></td>
              <td className="row-actions"><button className="link" onClick={() => toggle(c)}>{c.active ? "Deactivate" : "Activate"}</button></td>
            </tr>
          ))}
          {coupons.length === 0 && <tr><td colSpan="5" className="muted">No coupons yet.</td></tr>}
        </tbody>
      </table>
    </>
  );
}

const TABS = { stats: "Overview", products: "Products", orders: "Orders", coupons: "Coupons" };

export default function Admin() {
  const { user } = useStore();
  const [tab, setTab] = useState("stats");

  if (isDemoMode())
    return <p className="muted">The admin dashboard needs the API running. Clone the repo, start MongoDB and the server, then sign in as admin@souq.local.</p>;
  if (!user) return <p className="muted">Please <Link to="/login">sign in</Link>.</p>;
  if (user.role !== "admin") return <p className="muted">This area is for store admins only.</p>;

  return (
    <>
      <h1 className="page-head">Store admin</h1>
      <div className="chips">
        {Object.entries(TABS).map(([key, label]) => (
          <button key={key} className={`chip ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "stats" && <Stats />}
      {tab === "products" && <Products />}
      {tab === "orders" && <Orders />}
      {tab === "coupons" && <Coupons />}
    </>
  );
}
