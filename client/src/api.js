import { demoApi } from "./demo.js";

const BASE = import.meta.env.VITE_API_URL || "/api";
let demoMode = false;

// Probe the API once. The hosted preview has no backend, so when /api/health
// fails (or returns the SPA's index.html instead of JSON) the store runs on
// browser-local demo data and a banner says so.
const probe = (async () => {
  try {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error("no backend");
  } catch {
    demoMode = true;
    window.dispatchEvent(new Event("souq-demo-mode"));
  }
})();

export const isDemoMode = () => demoMode;

export function getToken() {
  return localStorage.getItem("souq_token");
}
export function setToken(token) {
  token ? localStorage.setItem("souq_token", token) : localStorage.removeItem("souq_token");
}

export async function api(path, { method = "GET", body } = {}) {
  await probe;
  if (demoMode) return demoApi(path, { method, body });
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}
