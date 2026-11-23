import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

const Icon = ({ d, size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px" }}>{d}</svg>
);
const PATHS = {
  All: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></>,
  Electronics: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></>,
  Fashion: <><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></>,
  Home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>,
  Books: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  Stationery: <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></>,
  Flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></>,
  Bag: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
};
const CATEGORY_ICONS = Object.fromEntries(
  Object.keys(PATHS).map((k) => [k, <Icon key={k} d={PATHS[k]} />])
);

function Stars({ rating }) {
  return <span className="stars" title={`${rating} out of 5`}>★<em>{rating}</em></span>;
}

function ProductCard({ p, onQuickView }) {
  const { addToCart } = useStore();
  const [liked, setLiked] = useState(false);
  return (
    <div className="card">
      <div className="card-media">
        <Link to={`/product/${p.slug}`}><img src={p.imageUrl} alt={p.name} loading="lazy" /></Link>
        <button className={`heart ${liked ? "on" : ""}`} onClick={() => setLiked(!liked)} aria-label="Save to wishlist">{liked ? "♥" : "♡"}</button>
        <span className="rating-badge">★ {p.rating}</span>
        <button className="quick-view" onClick={() => onQuickView(p)}>Quick view</button>
        {p.stock === 0 && <span className="soldout">Sold out</span>}
      </div>
      <div className="card-body">
        <span className="card-cat">{CATEGORY_ICONS[p.category]} {p.category}</span>
        <Link to={`/product/${p.slug}`} className="card-title">{p.name}</Link>
        <div className="card-foot">
          <strong>{p.price.toLocaleString()} <small>EGP</small></strong>
          <button className="add-btn" onClick={() => addToCart(p)} disabled={p.stock === 0} aria-label={`Add ${p.name} to cart`}>
            {p.stock === 0 ? "Sold out" : "Add +"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="card skeleton" key={i}>
          <div className="sk-img shimmer" />
          <div className="card-body">
            <div className="sk-line shimmer" style={{ width: "80%" }} />
            <div className="sk-line shimmer" style={{ width: "45%" }} />
            <div className="sk-line shimmer" style={{ width: "60%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickView({ product, onClose }) {
  const { addToCart, setDrawerOpen } = useStore();
  const [qty, setQty] = useState(1);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!product) return null;
  return (
    <div className="modal-root" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={product.name}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-media"><img src={product.imageUrl} alt={product.name} /></div>
        <div className="modal-info">
          <span className="chip-mini">{CATEGORY_ICONS[product.category]} {product.category}</span>
          <h2>{product.name}</h2>
          <Stars rating={product.rating} />
          <p className="modal-desc">{product.description}</p>
          <div className="modal-price">{product.price.toLocaleString()} <small>EGP</small></div>
          <p className={`stock ${product.stock === 0 ? "out" : ""}`}>{product.stock === 0 ? "Out of stock" : product.stock < 10 ? `Only ${product.stock} left` : "In stock"}</p>
          <div className="modal-actions">
            <div className="qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} disabled={qty >= product.stock}>+</button>
            </div>
            <button className="btn-primary" disabled={product.stock === 0} onClick={() => { addToCart(product, qty); onClose(); setDrawerOpen(true); }}>
              Add to cart
            </button>
          </div>
          <Link to={`/product/${product.slug}`} className="link" onClick={onClose}>View full details →</Link>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [quickView, setQuickView] = useState(null);
  const { addToCart } = useStore();
  const shopRef = useRef(null);

  useEffect(() => { api("/products/categories").then((d) => setCategories(d.categories)); }, []);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, ...(q && { q }), ...(category && { category }) });
    api(`/products?${params}`).then(setData).finally(() => setLoading(false));
  }, [q, category, sort]);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-pill">{CATEGORY_ICONS.Flame} Week of deals · up to 40% off selected picks</span>
          <h1>Make space for<br /><em>something better.</em></h1>
          <p>Electronics, fashion, home essentials and more. Cash on delivery, anywhere in Egypt.</p>
          <div className="hero-actions">
            <button className="btn-light" onClick={() => shopRef.current?.scrollIntoView({ behavior: "smooth" })}>Shop More</button>
            <span className="hero-note">Free returns · demo store</span>
          </div>
        </div>
        <div className="hero-media">
          <img src="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80" alt="Anker Soundcore R50i Earbuds" />
          <div className="hero-tag">
            <span>Anker Soundcore R50i</span>
            <strong>1,299 EGP</strong>
          </div>
        </div>
      </section>

      <div className="chips" ref={shopRef}>
        <button className={`chip ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>{CATEGORY_ICONS.All} All</button>
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? "active" : ""}`} onClick={() => setCategory(category === c ? "" : c)}>
            {CATEGORY_ICONS[c] || CATEGORY_ICONS.Bag} {c}
          </button>
        ))}
      </div>

      <div className="filters">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      {loading ? <SkeletonGrid /> : (
        <div className="grid">
          {data.items.map((p) => <ProductCard p={p} key={p._id} onQuickView={setQuickView} />)}
          {data.items.length === 0 && <p className="muted">No products match your search.</p>}
        </div>
      )}
      {quickView && <QuickView product={quickView} onClose={() => setQuickView(null)} />}
    </>
  );
}
