# Threat Model -- PenguWave Security Portal

## System Overview

PenguWave is an internal security operations portal where analysts view and triage security events. It has role-based access (admin, analyst, viewer), user management, and handles sensitive security event data. The system consists of a React SPA communicating with a backend API over HTTP, using JWT for authentication.

## What Could Go Wrong

### Authentication Threats
- **Brute force / credential stuffing:** An attacker could automate login attempts to guess credentials. Without rate limiting, thousands of attempts per second are possible.
- **Token theft:** JWTs stored in localStorage are accessible to any JavaScript running on the page. If combined with XSS, an attacker can steal tokens and impersonate users.
- **Weak passwords:** Without password complexity requirements, users may choose easily guessable passwords.
- **No session expiry:** Tokens without expiration allow indefinite access if leaked.

### Authorization Threats
- **Privilege escalation:** A non-admin user could attempt to call admin-only endpoints (e.g., `POST /api/users`) directly, bypassing frontend-only role checks.
- **IDOR (Insecure Direct Object Reference):** An analyst could manipulate event or user IDs in API calls to access data belonging to other users (e.g., `GET /api/events?userId=other-user`).
- **Horizontal access:** Without server-side user scoping, any authenticated user could view all events regardless of assignment.

### Injection & XSS Threats
- **XSS (existing vulnerabilities found in code review):** The current frontend contains two XSS vulnerabilities:
  1. `EventsPage.tsx:54` -- Search input is rendered as raw HTML, allowing script injection through the search box (e.g., a user typing `<img src=x onerror=alert(1)>` would execute JavaScript).
  2. `EventsPage.tsx:137` -- Event descriptions are injected as raw HTML via a ref callback, meaning a malicious event description stored in the database could execute arbitrary JavaScript in every analyst's browser.
- **SQL injection:** If user input is concatenated into SQL queries rather than parameterized, attackers could read, modify, or delete database contents.

### Data Exposure Threats
- **Plaintext passwords in UI:** The current `UsersPage` displays raw passwords in a table column and stores them in frontend state -- a critical exposure if anyone views the page.
- **Password input as plain text:** The user creation form uses `type="text"` for the password field, making it visible on screen.
- **Passwords in API responses:** If the backend returns password hashes in user objects, they become accessible to any authenticated user via browser dev tools.
- **Credential logging:** The existing `api.ts` logs email and password to the console on login.

### Infrastructure Threats
- **CORS misconfiguration:** Overly permissive CORS (e.g., `Access-Control-Allow-Origin: *`) would allow any website to make authenticated requests to the API.
- **Missing security headers:** Without headers like `X-Content-Type-Options`, `X-Frame-Options`, and CSP, the application is more vulnerable to clickjacking, MIME sniffing, and content injection.

## What We Plan to Protect Against

| Threat | Mitigation |
|--------|-----------|
| Brute force | Rate limiting on login endpoint |
| Token theft | Short JWT expiry, secure token handling |
| Weak passwords | Minimum length enforcement |
| Privilege escalation | Server-side role checks on every protected endpoint |
| IDOR | Scope event queries by authenticated user's ID (admins see all) |
| XSS | Remove unsafe HTML rendering; use safe React text rendering |
| SQL injection | Parameterized queries exclusively (via `better-sqlite3`) |
| Password exposure | bcrypt hashing; never return passwords in API responses; remove password column from UI |
| Credential logging | Remove console.log of credentials |
| CORS | Restrict origin to frontend URL only |
| Missing headers | Use `helmet` middleware for defense-in-depth HTTP headers |
| Disabled accounts | Check user status at login time; reject disabled users |
