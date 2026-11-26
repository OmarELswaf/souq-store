import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

function StarPicker({ value, onChange }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n} stars`}>★</button>
      ))}
    </div>
  );
}

function Reviews({ product, onRated }) {
  const { user, toast } = useStore();
  const [reviews, setReviews] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api(`/products/${product.slug}/reviews`).then((d) => setReviews(d.reviews));
  useEffect(() => { load(); }, [product.slug]);

  const mine = user && reviews?.find((r) => r.user === user.id);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api(`/products/${product.slug}/reviews`, { method: "POST", body: { rating, comment } });
      toast(mine ? "Review updated" : "Thanks for the review");
      setComment("");
      await load();
      onRated();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  if (!reviews) return null;
  return (
    <section className="reviews">
      <h2>Reviews ({reviews.length})</h2>
      {reviews.length === 0 && <p className="muted">No reviews yet. Bought this? Be the first.</p>}
      {reviews.map((r) => (
        <div className="review" key={r._id}>
          <div className="review-head">
            <strong>{r.name}</strong>
            <span className="stars">★<em>{r.rating}</em></span>
            <span className="muted small">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          {r.comment && <p>{r.comment}</p>}
        </div>
      ))}
      {user ? (
        <form className="form review-form" onSubmit={submit}>
          <h3>{mine ? "Update your review" : "Write a review"}</h3>
          <StarPicker value={rating} onChange={setRating} />
          <label>Comment (optional)
            <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="What did you think?" />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary" disabled={saving}>{saving ? "Posting..." : mine ? "Update review" : "Post review"}</button>
        </form>
      ) : (
        <p className="muted"><Link to="/login">Sign in</Link> to write a review.</p>
      )}
    </section>
  );
}

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
      <Reviews product={product} onRated={() => api(`/products/${slug}`).then((d) => setProduct(d.product))} />
    </>
  );
}
