# LoanPro — Loan Origination Management System

A full-stack, production-ready Loan Origination Management System built with **Node.js**, **Express**, **MySQL 8**, and **Vanilla JavaScript**.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [Running the App](#running-the-app)
9. [Demo Credentials](#demo-credentials)
10. [API Reference](#api-reference)
11. [Pages Overview](#pages-overview)
12. [Security Notes](#security-notes)

---

## Features

### User Features
- Register and log in with JWT-secured sessions
- Apply for loans (Personal, Home, Auto, Business, Education)
- Interactive EMI / repayment calculator
- Track all applications with live status badges
- Detailed loan modal with progress tracker

### Admin Features
- System-wide dashboard with live statistics
- Approve, Reject, and Disburse loans in one click
- Full applicant search and filter (status + type)
- Registered users list with role indicators
- Status breakdown bar chart

### Technical Features
- JWT authentication with 24-hour expiry
- bcrypt password hashing (12 rounds)
- Timing-safe login (prevents user enumeration)
- Status transition guards (server-side enforcement)
- Responsive design — mobile, tablet, desktop
- Skeleton loading states and toast notifications
- SVG donut chart (no external charting library)

---

## Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Frontend   | HTML5, CSS3, Vanilla JS     |
| Backend    | Node.js 18+, Express 4      |
| Database   | MySQL 8.0+                  |
| Auth       | JSON Web Tokens (JWT)       |
| Passwords  | bcryptjs                    |
| DB Client  | mysql2 (promise API)        |

---

## Project Structure

```
loan-origination-system/
├── frontend/
│   ├── index.html              ← Smart redirect landing
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html          ← User dashboard
│   ├── apply-loan.html         ← Loan application form + EMI calc
│   ├── loans.html              ← My loans (filter, search, modal)
│   ├── admin-dashboard.html    ← Admin overview + charts
│   ├── loan-management.html    ← Approve / Reject / Disburse
│   ├── css/
│   │   └── style.css           ← Full fintech design system
│   ├── js/
│   │   ├── api.js              ← Fetch wrapper, Auth, Toast, Fmt, initSidebar
│   │   ├── auth.js             ← Login & register logic
│   │   ├── dashboard.js        ← User dashboard data + SVG chart
│   │   ├── loans.js            ← My Loans + Apply Loan pages
│   │   └── admin.js            ← Admin dashboard + loan management
│   └── assets/
│
├── backend/
│   ├── server.js               ← Express app entry point
│   ├── package.json
│   ├── .env.example            ← Copy to .env and fill in values
│   ├── config/
│   │   └── db.js               ← MySQL connection pool (mysql2)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── loanRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── loanController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── models/
│
├── database/
│   ├── schema.sql              ← MySQL 8 tables, indexes, trigger, views
│   └── seed.js                 ← Sample users + loans (mysql2)
│
└── docs/
    └── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18  →  https://nodejs.org
- **MySQL 8.0+**  →  https://dev.mysql.com/downloads/mysql/
- **npm** ≥ 9 (bundled with Node)

---

## Quick Start

### 1 — Clone / open the project

```bash
cd loan-origination-system
```

### 2 — Install backend dependencies

```bash
cd backend
npm install
```

### 3 — Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials and a strong JWT secret:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=loan_origination_db
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_64_char_random_string_here
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4 — Create the database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS loan_origination_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 5 — Run schema migrations

```bash
mysql -u root -p loan_origination_db < ../database/schema.sql
```

### 6 — Seed sample data

```bash
node ../database/seed.js
```

### 7 — Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

### 8 — Open in browser

```
http://localhost:5000
```

---

## Environment Variables

| Variable         | Default                 | Description                           |
|------------------|-------------------------|---------------------------------------|
| `PORT`           | `5000`                  | Express server port                   |
| `NODE_ENV`       | `development`           | `development` or `production`         |
| `DB_HOST`        | `localhost`             | MySQL host                            |
| `DB_PORT`        | `3306`                  | MySQL port                            |
| `DB_NAME`        | `loan_origination_db`   | Database name                         |
| `DB_USER`        | `root`                  | MySQL user                            |
| `DB_PASSWORD`    | —                       | MySQL password                        |
| `JWT_SECRET`     | —                       | **Required.** Min 32 chars recommended|
| `JWT_EXPIRES_IN` | `24h`                   | Token lifetime (e.g. `1h`, `7d`)      |
| `CORS_ORIGIN`    | `*`                     | Allowed CORS origin(s), comma-sep     |

---

## Database Setup

### Schema overview

**`users` table**

| Column          | Type                    | Notes                              |
|-----------------|-------------------------|------------------------------------|
| `id`            | INT AUTO_INCREMENT PK   |                                    |
| `full_name`     | VARCHAR(100)            | Min 2 chars (CHECK constraint)     |
| `email`         | VARCHAR(150)            | Unique                             |
| `password_hash` | VARCHAR(255)            | bcrypt, rounds=12                  |
| `role`          | ENUM('user','admin')    | Default: `user`                    |
| `created_at`    | DATETIME                | Auto-set on INSERT                 |

**`loans` table**

| Column         | Type                                              | Notes                               |
|----------------|---------------------------------------------------|-------------------------------------|
| `id`           | INT AUTO_INCREMENT PK                             |                                     |
| `user_id`      | INT FK                                            | References `users(id)` CASCADE      |
| `loan_amount`  | DECIMAL(15,2)                                     | Min $1,000 (CHECK constraint)       |
| `loan_type`    | ENUM('personal','home','auto','business','education') |                                 |
| `credit_score` | SMALLINT                                          | 300–850 (CHECK constraint)          |
| `status`       | ENUM('pending','approved','rejected','disbursed') | Default: `pending`                  |
| `created_at`   | DATETIME                                          | Auto-set on INSERT                  |
| `updated_at`   | DATETIME                                          | Auto-updated by trigger + column    |

### Key MySQL-specific details

| PostgreSQL feature          | MySQL 8 equivalent                           |
|-----------------------------|----------------------------------------------|
| `SERIAL`                    | `INT AUTO_INCREMENT`                         |
| `TIMESTAMPTZ`               | `DATETIME` (UTC enforced via `timezone`)     |
| `CREATE TYPE … AS ENUM`     | Inline `ENUM(…)` on column                  |
| `$1, $2` placeholders       | `?` placeholders                             |
| `INSERT … RETURNING *`      | INSERT then `SELECT WHERE id = insertId`     |
| `ON CONFLICT … DO UPDATE`   | `ON DUPLICATE KEY UPDATE`                    |
| `COUNT(*) FILTER (WHERE …)` | `SUM(condition)` — booleans are 0/1 in MySQL |
| `::NUMERIC(6,1)` cast       | `CAST(… AS DECIMAL(6,1))`                   |
| `plpgsql` trigger functions | Native MySQL `BEGIN … END` trigger body      |

### Status transitions (enforced in API)

```
pending  → approved   ✓
pending  → rejected   ✓
approved → disbursed  ✓
approved → rejected   ✓
rejected → (anything) ✗
disbursed→ (anything) ✗
```

---

## Running the App

| Command          | Description                        |
|------------------|------------------------------------|
| `npm start`      | Start server (production)          |
| `npm run dev`    | Start with nodemon (development)   |
| `npm run seed`   | Seed the database with sample data |

**Health check:**
```
GET http://localhost:5000/api/health
```

---

## Demo Credentials

| Role  | Email                | Password   |
|-------|----------------------|------------|
| Admin | admin@loanpro.com    | Admin@123  |
| User  | john@example.com     | User@123   |
| User  | jane@example.com     | User@123   |
| User  | carlos@example.com   | User@123   |

> Click the **Quick Demo Access** buttons on the login page to auto-fill credentials.

---

## API Reference

### Authentication

| Method | Endpoint              | Auth     | Body                               |
|--------|-----------------------|----------|------------------------------------|
| POST   | `/api/auth/register`  | None     | `full_name, email, password, role` |
| POST   | `/api/auth/login`     | None     | `email, password`                  |
| GET    | `/api/auth/profile`   | Bearer   | —                                  |

### Loans (User)

| Method | Endpoint              | Auth   | Body                                       |
|--------|-----------------------|--------|--------------------------------------------|
| POST   | `/api/loans/apply`    | Bearer | `loan_type, loan_amount, credit_score`     |
| GET    | `/api/loans/my-loans` | Bearer | —                                          |

### Loans (Admin)

| Method | Endpoint                | Auth         | Body / Query          |
|--------|-------------------------|--------------|-----------------------|
| GET    | `/api/loans/all`        | Bearer+Admin | `?status=&loan_type=` |
| PUT    | `/api/loans/:id/status` | Bearer+Admin | `{ status }`          |
| GET    | `/api/loans/stats`      | Bearer+Admin | —                     |
| GET    | `/api/loans/users`      | Bearer+Admin | —                     |

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Pages Overview

| Page                | URL                      | Access |
|---------------------|--------------------------|--------|
| Landing / Redirect  | `/index.html`            | Public |
| Login               | `/login.html`            | Public |
| Register            | `/register.html`         | Public |
| User Dashboard      | `/dashboard.html`        | User   |
| Apply for Loan      | `/apply-loan.html`       | User   |
| My Loans            | `/loans.html`            | User   |
| Admin Dashboard     | `/admin-dashboard.html`  | Admin  |
| Loan Management     | `/loan-management.html`  | Admin  |

---

## Security Notes

- Passwords are hashed with bcrypt at **12 rounds** — never stored in plaintext.
- Login uses a **timing-safe** dummy hash comparison to prevent user-enumeration timing attacks.
- JWTs are signed with `HS256` and expire after 24 hours by default.
- Admin routes are double-gated: `verifyToken` + `verifyAdmin`.
- Status transitions are validated server-side — the frontend UI is not trusted.
- Request bodies are limited to **10 KB** to prevent large-payload attacks.
- Basic security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) are set on every response.
- **For production:** enable HTTPS, set `NODE_ENV=production`, pin `CORS_ORIGIN` to your domain, and rotate `JWT_SECRET` regularly.

---

*LoanPro Origination System v2.0.0 — MySQL 8 Edition*
