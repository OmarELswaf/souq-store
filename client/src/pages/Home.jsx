import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function Home() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useStore();

  useEffect(() => { api("/products/categories").then((d) => setCategories(d.categories)); }, []);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, ...(q && { q }), ...(category && { category }) });
    api(`/products?${params}`).then(setData).finally(() => setLoading(false));
  }, [q, category, sort]);

  return (
    <>
      <div className="filters">
        <input placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
      {loading ? <p className="muted">Loading...</p> : (
        <div className="grid">
          {data.items.map((p) => (
            <div className="card" key={p._id}>
              <Link to={`/product/${p.slug}`}><img src={p.imageUrl} alt={p.name} loading="lazy" /></Link>
              <div className="card-body">
                <Link to={`/product/${p.slug}`} className="card-title">{p.name}</Link>
                <span className="card-cat">{p.category}</span>
                <div className="card-foot">
                  <strong>{p.price.toLocaleString()} EGP</strong>
                  <button onClick={() => addToCart(p)} disabled={p.stock === 0}>
                    {p.stock === 0 ? "Sold out" : "Add to cart"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {data.items.length === 0 && <p className="muted">No products match your search.</p>}
        </div>
      )}
    </>
  );
}
