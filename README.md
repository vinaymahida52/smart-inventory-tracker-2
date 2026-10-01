# Dukaan Tracker

A web-based inventory management system built for India's micro-retailers (kirana
stores, small pharmacies, general stores). Scan a QR code to update stock in
seconds, see low-stock alerts before you run out, and get a quick read on how
the shop is doing — all in a clean, dark, distraction-free UI.

## Features

- **QR code scanning** — every product gets an auto-generated QR code to print
  and stick on the shelf. Scan it with any device camera (or type the SKU) to
  instantly look up the item and adjust stock.
- **Real-time stock updates** — all connected devices (owner's laptop, staff
  phone at the counter) stay in sync instantly over WebSockets. Sell or
  restock from one screen, see it update everywhere else immediately.
- **Low-stock alerts** — set a per-product reorder threshold; the dashboard
  surfaces anything running low or already out of stock.
- **User roles** — `admin` (full control + team management), `manager`
  (manage products & stock), `staff` (scan & sell only). Keeps the shelf
  staff from accidentally deleting products or price data.
- **Basic analytics** — inventory value, potential revenue, stock movement
  over the last 7 days, category breakdown, recent activity feed.
- **Minimalist dark theme** — built for a phone-sized screen behind a counter
  as much as a laptop in the back office.

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, React Router,
  Recharts (analytics), `html5-qrcode` (camera scanning), Socket.IO client.
- **Backend:** Node.js + Express, Socket.IO (real-time), JWT auth,
  `bcryptjs` password hashing, `qrcode` for QR generation.
- **Database:** SQLite via Node's built-in `node:sqlite` module for local
  development (zero native build dependencies — works out of the box on
  Windows with no admin rights or compiler toolchain). The schema
  (`server/src/db/init.js`) is plain, portable SQL and maps directly onto
  **PostgreSQL** for production — swap `node:sqlite` for `pg` and point it at
  a managed Postgres instance (e.g. [Neon](https://neon.tech) or
  [Supabase](https://supabase.com), both have generous free tiers and work
  well with Vercel) without touching the route logic or schema design.

## Project structure

```
client/   Vite + React frontend (dashboard, products, scan, team pages)
server/   Express API + SQLite database + Socket.IO real-time layer
.rahu/    run config for the Rahu agent launcher
```

## Running it locally

Requires **Node.js 22+** (uses the built-in `node:sqlite` module — tested on
Node 24).

```bash
npm run install:all   # installs server/ and client/ dependencies
npm run dev            # starts API on :4873 and frontend on :5173
```

Then open **http://localhost:5173**.

Demo logins (seeded automatically on first run):

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@dukaan.app    | admin123  |
| Staff | staff@dukaan.app    | staff123  |

To run the pieces individually:

```bash
npm run dev:server   # API only, http://localhost:4873
npm run dev:client   # frontend only, http://localhost:5173 (proxies /api to the server)
```

The SQLite database file is created automatically at
`server/src/db/inventory.sqlite` with demo products on first run. Delete that
file to reset to a fresh seeded state.

### Building for production

```bash
cd client && npm run build   # outputs static assets to client/dist
```

## Deploying

- **Frontend:** deploy `client/` to **Vercel** as a static Vite build
  (`npm run build`, output directory `dist`).
- **Backend:** Vercel's serverless functions don't suit a stateful
  Socket.IO + SQLite server well — deploy `server/` to a small always-on
  Node host (Render, Railway, Fly.io) and swap the SQLite layer for managed
  **PostgreSQL** (Neon/Supabase), since serverless filesystems are ephemeral.
  Point the client's `/api` and `/socket.io` requests at that backend's URL
  via an environment variable + Vercel rewrite.

## Monetisation — freemium SaaS

- **Free tier (first 12 months):** full feature access for a single shop,
  up to 2 team members — gets micro-retailers used to digital stock-keeping
  with zero upfront cost.
- **Pro — $5/month:** unlimited team members, multi-outlet support, CSV
  export, WhatsApp/SMS low-stock alerts, priority support.
- Low price point matches the target segment (micro-retailers running on
  thin margins); revenue scales via volume rather than per-seat pricing
  common in enterprise inventory tools.
- Natural upsell path once a shop outgrows the free limits (second outlet,
  bigger team) rather than a hard paywall on core functionality.

## Notes on roles

- **Admin** — everything, plus add/remove team members.
- **Manager** — add/edit/delete products, adjust stock.
- **Staff** — scan QR codes and adjust stock only (can't edit prices or
  delete products) — safe to hand a phone with this login to counter staff.
