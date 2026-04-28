# Frontend Security Fixes & Improvements

A summary of vulnerabilities found in the original PenguWave frontend and how each was fixed.

---

## 1. XSS via Search Input (Reflected XSS)

**File:** `src/pages/EventsPage.tsx:53-58`

**Old code:** Search input was rendered as raw HTML using React's unsafe HTML injection API, concatenating user input directly into an HTML string.

**Problem:** User input from the search box is injected directly as raw HTML. Typing `<img src=x onerror=alert(document.cookie)>` in the search field would execute arbitrary JavaScript in the user's browser. This is a reflected XSS vulnerability -- the attacker just needs to trick a user into pasting a malicious search string.

**Fixed code:**
```tsx
<p>
  Showing results for: <strong>{search}</strong> ({filtered.length} events)
</p>
```

**Why this fixes it:** React's JSX `{search}` automatically escapes HTML entities, so `<script>` becomes `&lt;script&gt;` -- rendered as text, never executed.

---

## 2. XSS via Event Description (Stored XSS)

**File:** `src/pages/EventsPage.tsx:135-139`

**Old code:** Event descriptions from the database were injected as raw HTML using a ref callback that set the element's raw HTML content directly from `selectedEvent.description`.

**Problem:** If an attacker can insert a malicious description into the events data (e.g., `<img src=x onerror=fetch(...)>`), it executes in every analyst's browser when they view the event. This is a stored XSS vulnerability -- the most dangerous kind because it persists and affects all users.

**Fixed code:**
```tsx
<p>{selectedEvent.description}</p>
```

**Why this fixes it:** React's text interpolation escapes all HTML. Descriptions render as plain text.

---

## 3. Plaintext Passwords Displayed in UI

**File:** `src/pages/UsersPage.tsx:9-11, 96-110`

**Old code:** Users were initialized in frontend state with plaintext passwords (e.g., `password: "admin123"`), and a `Password` column in the table rendered them visibly using monospace font.

**Problem:** Passwords are stored in plaintext in frontend state and displayed in a visible table column. Anyone who views the Users page (or inspects React DevTools) can see all user passwords.

**Fixed code:**
- Removed `password` field from the `User` TypeScript interface entirely
- Removed the password column from the users table
- Users are now fetched from the backend API, which never returns passwords
- Backend stores passwords as bcrypt hashes

---

## 4. Password Input Field Uses `type="text"`

**File:** `src/pages/UsersPage.tsx:68-69`

**Old code:** The new user form used `<input type="text">` for the password field.

**Problem:** The password input renders as visible plain text. Anyone looking at the screen can read the password being typed. Browser password managers won't recognize it as a password field.

**Fixed code:**
```tsx
<input type="password" value={newPassword} placeholder="Minimum 6 characters" required />
```

---

## 5. Credentials Logged to Console

**File:** `src/api.ts:3`

**Old code:** The login function contained `console.log("Login attempt:", email, password)`.

**Problem:** Email and password are logged to the browser console on every login attempt. Credentials are visible to anyone with DevTools open and could be captured by browser extensions.

**Fixed code:** The `login` function was removed from `api.ts`. Authentication is now handled through `AuthContext` which never logs credentials.

---

## 6. Dismissible Login Modal (No Real Auth)

**File:** `src/components/LoginModal.tsx`, `src/App.tsx:11-24`

**Old code:** A `LoginModal` component could be dismissed by clicking the X button or backdrop. The dismiss state was stored in `sessionStorage`, allowing access to all pages without authentication.

**Problem:** The login modal is purely cosmetic -- users can dismiss it and access all pages (Events, Users) without authenticating. There is no actual access control.

**Fixed code:**
- Replaced the modal with a dedicated `/login` route (`LoginPage.tsx`)
- Added `ProtectedRoute` component that checks real authentication state
- Unauthenticated users are redirected to `/login`
- Authentication state is managed via `AuthContext` using JWT tokens from the backend

---

## 7. No Role-Based Access Control in Frontend

**File:** `src/App.tsx`, `src/components/Navbar.tsx`

**Old code:** The `UsersPage` had a TODO comment (`// TODO: add role check before rendering`) but no actual implementation. All users could navigate to `/users` freely.

**Problem:** All users can navigate to the Users page regardless of their role.

**Fixed code:**
- `ProtectedRoute` accepts `requiredRole` prop -- `/users` requires `"admin"`
- Navbar only shows "Users" link for admin users
- Non-admins navigating to `/users` are redirected to `/events`
- Server-side enforcement is the real security boundary; frontend is UX convenience

---

## 8. No Error Handling on API Calls

**File:** `src/api.ts`

**Old code:** API functions called `res.json()` without checking `res.ok`, silently returning error objects as valid data.

**Problem:** Server errors (401, 500) are silently returned as data, leading to confusing UI behavior.

**Fixed code:**
```tsx
async function handleResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
```

All API functions now use `handleResponse`, and components display errors clearly with loading states.
