import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const { addToCart } = useStore();

  useEffect(() => {
    api(`/products/${slug}`).then((d) => setProduct(d.product)).catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <p className="muted">{error}. <Link to="/">Back to shop</Link></p>;
  if (!product) return <p className="muted">Loading...</p>;

  return (
    <div className="product">
      <img src={product.imageUrl} alt={product.name} />
      <div>
        <span className="card-cat">{product.category}</span>
        <h1>{product.name}</h1>
        <p className="rating">Rating: {product.rating} / 5</p>
        <p>{product.description}</p>
        <p className="price">{product.price.toLocaleString()} EGP</p>
        <p className="muted">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
        <button onClick={() => { addToCart(product); setAdded(true); }} disabled={product.stock === 0}>
          {added ? "Added - view cart" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
