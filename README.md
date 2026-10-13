# Library Lending System (LiberFlow)

An enterprise-grade, relational library lending system featuring **Title vs. Physical Copy separation**, **ACID concurrency transactions**, **partial unique database indexes**, and an **Apple-inspired dark UI**.

Developed for **DBMS Semester 5 Lab Continuous Assessment (LCA)**.

---

## 📸 Key Capabilities

1. **Title vs. Physical Copy Separation:**
   * Titles maintain catalog information (`ISBN`, `title`, `publisher`, `categories`, `authors`).
   * Copies track physical lendable inventory items (`barcode`, `location`, `status: 'available' | 'on_loan' | 'on_hold'`).
2. **ACID Transactions:**
   * Atomic checkouts enforcing member active status, borrowing quota (`max_loans`), and copy availability.
   * Atomic returns calculating overdue fines (\$1.00/day) and automatically allocating returned inventory to the earliest waiting reservation.
3. **Advanced Business Logic & Workers:**
   * **Self-Service Loan Renewal:** Students can renew loans for +7 days (max 2 renewals) provided the book has no waiting holds.
   * **Background Hold Reaper Worker:** Automatically reaps expired reservations (3-day pickup window) every 60 seconds and advances the queue.
   * **Fine Settlement Ledger:** Librarians can collect fines and clear delinquency records.
   * **Immutable Audit Trail:** Dedicated `audit_logs` table tracking every system event with user IDs and timestamps.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons (Apple Design Language)
* **Backend:** Node.js, TypeScript, Express, Zod, JWT, Bcrypt
* **Database Engine:** Relational SQLite with **WAL Mode (`journal_mode = WAL`)** and **Foreign Key Enforcement (`foreign_keys = ON`)**
* **Deployment:** Docker & Docker Compose with multi-stage builds and Nginx reverse proxy

---

## 🐳 Quick Reproducible Setup (Docker Compose)

The easiest way to reproduce the entire environment with zero manual configuration:

```bash
docker compose up --build
```

* **Frontend UI:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:5001](http://localhost:5001)

---

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5001`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000` (automatically proxies `/api` requests to backend)*

---

## 🔑 Demo Accounts (Password for all: `password123`)

| Role | Email | Scenario & Test Case |
|---|---|---|
| **Librarian** | `librarian@library.edu` | Access the **Circulation Desk** (checkout/return), register members, add titles, and collect fines. |
| **Member (Alex)** | `alex@student.edu` | Active borrower with an on-time checkout of *Database System Concepts* (`BC-DBS-003`). Can test **Renew (+7d)**. |
| **Member (Priya)** | `priya@student.edu` | Has an **overdue checkout** of *Introduction to Algorithms* (`BC-CLRS-002`) with an accrued fine. |
| **Admin** | `admin@library.edu` | Full system administrator privileges. |

---

## ☁️ How to Host in Production

### Option 1: Docker (Single VPS / DigitalOcean / AWS EC2 / Hetzner)
1. Clone this repository on your server.
2. Run `docker compose up -d`.
3. Set up a reverse proxy (e.g. Caddy or Nginx) pointing your domain to port `3000`.

### Option 2: Render.com / Railway
1. **Backend:** Deploy the `/backend` folder as a Node.js Web Service.
   * Build Command: `npm install && npm run build`
   * Start Command: `npm start`
   * Add a persistent volume mounted at `/app/data` to persist `library.db`.
2. **Frontend:** Deploy the `/frontend` folder as a Static Site.
   * Build Command: `npm run build`
   * Publish Directory: `dist`
   * Set Environment Variable: `VITE_API_URL` pointing to your deployed backend URL.
