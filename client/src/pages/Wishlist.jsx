import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function Wishlist() {
  const { user, addToCart, toggleWishlist, setDrawerOpen } = useStore();
  const [products, setProducts] = useState(null);

  const load = () => api("/wishlist").then((d) => setProducts(d.products));
  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <p className="muted">Please <Link to="/login">sign in</Link> to see your wishlist.</p>;
  if (!products) return <p className="muted">Loading...</p>;
  if (products.length === 0)
    return <p className="muted">Nothing saved yet. Tap the ♡ on any product to keep it here.</p>;

  return (
    <>
      <h1 className="page-head">Wishlist</h1>
      <div className="grid">
        {products.map((p) => (
          <div className="card" key={p._id}>
            <div className="card-media">
              <Link to={`/product/${p.slug}`}><img src={p.imageUrl} alt={p.name} loading="lazy" /></Link>
              <button className="heart on" onClick={async () => { await toggleWishlist(p); load(); }} aria-label="Remove from wishlist">♥</button>
              {p.stock === 0 && <span className="soldout">Sold out</span>}
            </div>
            <div className="card-body">
              <span className="card-cat">{p.category}</span>
              <Link to={`/product/${p.slug}`} className="card-title">{p.name}</Link>
              <div className="card-foot">
                <strong>{p.price.toLocaleString()} <small>EGP</small></strong>
                <button className="add-btn" disabled={p.stock === 0}
                  onClick={() => { addToCart(p); setDrawerOpen(true); }}>
                  {p.stock === 0 ? "Sold out" : "Add +"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
