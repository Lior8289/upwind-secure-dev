# PenguWave -- Security Operations Portal

A full-stack security operations portal where analysts view and triage security events. Built with React + TypeScript (frontend) and Express + SQLite (backend).

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Running the project

```bash
# 1. Install and start the backend
cd backend
npm install
npm run dev          # Starts on http://localhost:3001

# 2. In a separate terminal, install and start the frontend
npm install          # From project root
npm run dev          # Starts on http://localhost:5173
```

The database is created automatically on first run and seeded with default users.

### Default Credentials

| Email                  | Password  | Role    | Status   |
|------------------------|-----------|---------|----------|
| admin@penguwave.io     | admin123  | admin   | active   |
| analyst@penguwave.io   | pass456   | analyst | active   |
| viewer@penguwave.io    | view789   | viewer  | disabled |

---

## Architecture

```
Frontend (React + Vite)          Backend (Express + TypeScript)
  :5173                            :3001
┌──────────────────┐            ┌──────────────────────────────┐
│  LoginPage       │            │  POST /api/auth/login        │
│  EventsPage      │───HTTP────▶│  GET  /api/auth/me           │
│  UsersPage       │◀───JSON────│  GET  /api/events            │
│  AuthContext     │            │  GET/POST/PATCH/DELETE /users │
│  ProtectedRoute  │            │                              │
└──────────────────┘            │  Middleware: helmet, cors,    │
                                │  rate-limit, JWT auth, RBAC  │
                                │                              │
                                │  SQLite (better-sqlite3)     │
                                └──────────────────────────────┘
```

---

## How Authentication Works

### Login Flow

1. User submits email + password on `/login`
2. Backend verifies credentials against bcrypt-hashed passwords in SQLite
3. If valid and account is active, backend signs a JWT containing `{ userId, email, role }`
4. JWT is returned to the frontend and stored in `localStorage`
5. `AuthContext` stores the user state and provides it to all components
6. All subsequent API requests include the JWT in the `Authorization: Bearer <token>` header

### Token Details

- **Algorithm:** HS256
- **Expiry:** 8 hours
- **Payload:** `userId`, `email`, `role` (no sensitive data)
- **Secret:** Configured via `JWT_SECRET` environment variable (defaults to dev secret)

### Logout

Since JWTs are stateless, we implement a **token blacklist**:
1. On logout, the token is stored in a `token_blacklist` table with its expiry time
2. The auth middleware checks the blacklist on every request
3. Blacklisted tokens are rejected with 401

### Session Verification

On page load, `AuthContext` calls `GET /api/auth/me` to verify the stored token is still valid. If the token is expired, blacklisted, or invalid, the user is redirected to `/login`.

### Password Security

- Passwords are hashed with **bcrypt** (12 rounds) before storage
- Plaintext passwords are never stored, logged, or returned in API responses
- The `User` type in the frontend has no password field

---

## How Authorization Is Enforced

### Role-Based Access Control (RBAC)

Three roles with escalating permissions:

| Action               | viewer | analyst | admin |
|----------------------|--------|---------|-------|
| View own events      | Yes    | Yes     | Yes   |
| View all events      | No     | No      | Yes   |
| Manage users (CRUD)  | No     | No      | Yes   |

### Enforcement Layers

Authorization is enforced **server-side** at two levels:

1. **Authentication middleware (`auth.ts`):** Verifies JWT on every protected route. Rejects requests with missing, expired, or blacklisted tokens (401).

2. **Authorization middleware (`authorize.ts`):** Checks the user's role from the JWT against allowed roles for the endpoint. The user management routes (`/api/users`) require the `admin` role (403 for non-admins).

3. **Data scoping (IDOR prevention):** The events endpoint filters results by `userId` from the JWT -- not from a client-supplied parameter. Non-admin users only see events where `event.userId === jwt.userId`. This prevents horizontal privilege escalation (accessing another user's events by guessing IDs).

4. **Frontend guards (UX only):** `ProtectedRoute` redirects unauthenticated users to `/login`. The Users nav link is hidden for non-admins. These are convenience features, not security boundaries.

### Additional Authorization Rules

- **Disabled accounts:** Checked at login time. Disabled users receive "Account is disabled" and cannot obtain a token.
- **Self-deletion prevention:** Admins cannot delete their own account via the API.
- **Input validation:** Email format, password length (6-128 chars), role enum, and status enum are validated on all write endpoints.

---

## Security Measures

| Threat                | Mitigation                                              |
|-----------------------|---------------------------------------------------------|
| Brute force           | Rate limiting on login (10 attempts / 15 min)           |
| XSS (reflected)       | Fixed: removed unsafe HTML rendering of search input     |
| XSS (stored)          | Fixed: removed raw HTML injection of event descriptions  |
| SQL injection         | Parameterized queries via `better-sqlite3`               |
| Password exposure     | bcrypt hashing; passwords never in API responses         |
| Credential logging    | Removed `console.log` of login credentials               |
| IDOR                  | Events filtered by JWT userId server-side                |
| CORS                  | Restricted to frontend origin only                       |
| Missing headers       | `helmet` adds security headers (CSP, X-Frame-Options, etc.) |
| Large payloads        | Request body limited to 10KB                             |
| Token reuse after logout | Token blacklist table                                |

See `docs/THREAT_MODEL.md` for the full threat analysis and `docs/frontend_fixes.md` for detailed code-level vulnerability descriptions and fixes.

---

## Production Deployment Considerations

### What to change for production

1. **JWT secret:** Set a strong, random `JWT_SECRET` environment variable (at least 256-bit). Never use the default dev secret.

2. **HTTPS:** Deploy behind a reverse proxy (nginx, Cloudflare) with TLS. Set `Secure` and `SameSite` cookie flags if migrating from localStorage to httpOnly cookies.

3. **Database:** Replace SQLite with PostgreSQL or MySQL for concurrent write performance. SQLite is single-writer and unsuitable for multi-instance deployments.

4. **CORS origin:** Set `CORS_ORIGIN` to the production frontend URL. Never use wildcards.

5. **Rate limiting:** Use a distributed rate limiter (Redis-backed) instead of in-memory, so limits apply across multiple server instances.

6. **Token storage:** Consider migrating from `localStorage` to httpOnly cookies to prevent token theft via XSS. This requires CSRF protection (e.g., double-submit cookie pattern).

7. **Logging & monitoring:** Add structured logging (e.g., Winston/Pino) with log aggregation. Monitor failed login attempts, rate limit hits, and authorization failures.

8. **Password policy:** Enforce stronger password requirements (minimum length, complexity) and consider integrating with a breached-password database (e.g., Have I Been Pwned).

9. **Token blacklist cleanup:** Add a scheduled job to purge expired entries from `token_blacklist` to prevent table growth.

10. **Environment separation:** Use `.env` files per environment. Never commit secrets to version control.

---

## Project Structure

```
upwind-secure-dev/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry point
│   │   ├── config.ts             # Configuration (JWT, DB, CORS)
│   │   ├── database.ts           # SQLite setup + seed data
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT verification
│   │   │   ├── authorize.ts      # Role-based access control
│   │   │   └── rateLimiter.ts    # Rate limiting
│   │   ├── routes/
│   │   │   ├── auth.ts           # Login, logout, me
│   │   │   ├── events.ts         # Security events API
│   │   │   └── users.ts          # User management (admin)
│   │   └── utils/
│   │       └── validation.ts     # Input validation
│   ├── package.json
│   └── tsconfig.json
├── src/                          # React frontend
│   ├── context/AuthContext.tsx    # Auth state management
│   ├── components/
│   │   ├── Navbar.tsx            # Navigation with role-based links
│   │   └── ProtectedRoute.tsx    # Route guard
│   ├── pages/
│   │   ├── LoginPage.tsx         # Login form
│   │   ├── EventsPage.tsx        # Security events table
│   │   ├── UsersPage.tsx         # User management (admin)
│   │   └── NotFound.tsx          # 404 page
│   ├── api.ts                    # Backend API client
│   └── types.ts                  # TypeScript interfaces
├── data/
│   └── mock_events.json          # 50 mock security events
└── docs/
    ├── api_contract.md           # API specification
    ├── THREAT_MODEL.md           # Threat analysis (Task 1)
    └── frontend_fixes.md         # Security vulnerabilities found & fixed
```

---

## API Reference

See `docs/api_contract.md` for the full API specification. Summary:

| Method | Endpoint            | Auth Required | Role Required |
|--------|---------------------|:-------------:|:-------------:|
| POST   | /api/auth/login     | No            | --            |
| POST   | /api/auth/logout    | Yes           | --            |
| GET    | /api/auth/me        | Yes           | --            |
| GET    | /api/events         | Yes           | --            |
| GET    | /api/events/:id     | Yes           | --            |
| GET    | /api/users          | Yes           | admin         |
| POST   | /api/users          | Yes           | admin         |
| PATCH  | /api/users/:id      | Yes           | admin         |
| DELETE | /api/users/:id      | Yes           | admin         |
