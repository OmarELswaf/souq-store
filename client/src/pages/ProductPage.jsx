import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const { addToCart, setDrawerOpen } = useStore();

  useEffect(() => {
    setProduct(null); setQty(1);
    api(`/products/${slug}`).then((d) => setProduct(d.product)).catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <p className="muted" style={{ marginTop: 40 }}>{error}. <Link to="/">Back to shop</Link></p>;
  if (!product) return (
    <div className="pd">
      <div className="pd-media shimmer" style={{ aspectRatio: 1 }} />
      <div className="pd-info">
        <div className="sk-line shimmer" style={{ width: "30%" }} />
        <div className="sk-line shimmer" style={{ width: "70%", height: 22 }} />
        <div className="sk-line shimmer" style={{ width: "90%" }} />
        <div className="sk-line shimmer" style={{ width: "85%" }} />
      </div>
    </div>
  );

  return (
    <>
      <p className="crumbs"><Link to="/">Shop</Link> / {product.category} / {product.name}</p>
      <div className="pd">
        <div className="pd-media"><img src={product.imageUrl} alt={product.name} /></div>
        <div className="pd-info">
          <span className="chip-mini">{product.category}</span>
          <h1>{product.name}</h1>
          <span className="stars">★<em>{product.rating} / 5</em></span>
          <p className="pd-desc">{product.description}</p>
          <div className="pd-price">{product.price.toLocaleString()} <small>EGP</small></div>
          <p className={`stock ${product.stock === 0 ? "out" : ""}`}>{product.stock === 0 ? "Out of stock" : product.stock < 10 ? `Only ${product.stock} left in stock` : `${product.stock} in stock`}</p>
          <div className="pd-actions">
            <div className="qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} disabled={qty >= product.stock}>+</button>
            </div>
            <button className="btn-primary" disabled={product.stock === 0} onClick={() => { addToCart(product, qty); setDrawerOpen(true); }}>
              Buy for {(product.price * qty).toLocaleString()} EGP
            </button>
          </div>
          <p className="muted small">Cash on delivery · free returns · demo checkout</p>
        </div>
      </div>
    </>
  );
}
