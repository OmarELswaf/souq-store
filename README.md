# Souq - MERN E-Commerce Store

A full-stack e-commerce store built with MongoDB, Express, React and Node.js.
Prices are in EGP and checkout is cash on delivery - there is no fake payment
integration. The hosted demo runs on demo data in the browser when the API is
not connected (a banner says so); the full stack below is the real app.

## Demo and verification

- Hosted demo: https://souq-store-roan.vercel.app/
- The hosted storefront uses browser demo data when the API is unavailable. It is not a connected production shop.
- On 23 November 2026, all six API integration tests passed against isolated in-memory MongoDB, and the React production build passed.
- These checks did not place a real order or verify a deployed backend.

## Features

- Product catalog with full-text search, category filter and sorting
- Product detail pages with stock status
- Cart with quantity limits tied to real stock
- JWT auth (register / login / session restore), bcrypt password hashing
- Checkout creates an order: server prices every line from the database,
  checks stock and decrements it atomically (conditional update, race-safe)
- Order history per account, order detail, and customer cancellation with
  stock restore while the order is still pending or confirmed
- Admin API: product create / update / delete, full order list with status
  workflow (pending -> confirmed -> shipped -> delivered, cancel restores
  stock and blocks bad transitions), dashboard stats (revenue, orders by
  status, low stock) and the customer list
- Admin dashboard UI (/admin): overview cards, product table with
  create/edit/delete, order board with one-click status moves
- Order detail page with a visual status tracker and a cancel button
- Account page (/profile) with name and default delivery address; checkout
  pre-fills the address from the profile
- Catalog pagination (12 per page with Prev/Next)
- API tests covering auth, listing, ordering and stock rules (node:test + supertest + mongodb-memory-server)
- Helmet + CORS + JSON body limits on the API

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, React Router, plain CSS |
| Backend  | Node.js, Express, Mongoose, JWT, bcrypt |
| Database | MongoDB |
| Tests    | node:test, supertest, mongodb-memory-server |

## Quick start

```bash
# 1. Clone and start MongoDB (Docker)
git clone https://github.com/OmarELswaf/souq-store.git
cd souq-store
docker compose up -d

# 2. API on http://localhost:5000
cd server
cp .env.example .env
npm install
npm run seed    # 12 products + admin@souq.local / admin12345
npm run dev

# 3. Client on http://localhost:5173 (proxies /api to :5000)
cd ../client
npm install
npm run dev
```

Run the tests:

```bash
cd server && npm test
```

## API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | - | Create account, returns JWT |
| POST | /api/auth/login | - | Sign in, returns JWT |
| GET | /api/auth/me | Bearer | Current user |
| PATCH | /api/auth/me | Bearer | Update name / default address |
| GET | /api/products | - | List, supports q, category, sort, page, limit |
| GET | /api/products/categories | - | Distinct categories |
| GET | /api/products/:slug | - | One product |
| POST | /api/orders | Bearer | Place order (cash on delivery) |
| GET | /api/orders/mine | Bearer | My orders |
| GET | /api/orders/mine/:id | Bearer | One of my orders |
| POST | /api/orders/mine/:id/cancel | Bearer | Cancel my pending/confirmed order |
| POST | /api/admin/products | Admin | Create a product |
| PATCH | /api/admin/products/:id | Admin | Update a product |
| DELETE | /api/admin/products/:id | Admin | Delete a product |
| GET | /api/admin/orders | Admin | All orders, filter by status |
| GET | /api/admin/orders/:id | Admin | One order with customer |
| PATCH | /api/admin/orders/:id/status | Admin | Move an order through the workflow |
| GET | /api/admin/stats | Admin | Revenue, orders by status, low stock |
| GET | /api/admin/users | Admin | Customer list |

## Notes

- Client state (cart, token) persists in localStorage.
- `client/src/demo.js` implements the same API surface in the browser so the
  static preview works without a backend; it only activates when the API is
  unreachable and is clearly labeled in the UI.
- Prices are demo values; product photos are Unsplash placeholders.
