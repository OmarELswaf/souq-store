import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useStore } from "../store.jsx";

export default function Profile() {
  const { user, setUser, toast } = useStore();
  const [form, setForm] = useState({ name: "", city: "", street: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) setForm({
      name: user.name || "",
      city: user.address?.city || "",
      street: user.address?.street || "",
      phone: user.address?.phone || "",
    });
  }, [user]);

  if (!user) return <p className="muted">Please <Link to="/login">sign in</Link>.</p>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const d = await api("/auth/me", { method: "PATCH", body: {
        name: form.name,
        address: { city: form.city, street: form.street, phone: form.phone },
      }});
      setUser(d.user);
      toast("Profile saved");
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div className="narrow">
      <h1 className="page-head">My account</h1>
      <p className="muted">{user.email} {user.role === "admin" && <span className="status confirmed">admin</span>}</p>
      <form className="form" onSubmit={save}>
        <label>Full name
          <input value={form.name} onChange={set("name")} required />
        </label>
        <fieldset>
          <legend>Default delivery address <span className="muted small">(pre-fills checkout)</span></legend>
          <label>City
            <input value={form.city} onChange={set("city")} placeholder="Cairo" />
          </label>
          <label>Street
            <input value={form.street} onChange={set("street")} placeholder="Street and building" />
          </label>
          <label>Phone
            <input value={form.phone} onChange={set("phone")} placeholder="01xxxxxxxxx" />
          </label>
        </fieldset>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
      </form>
    </div>
  );
}
