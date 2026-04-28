import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { getDb } from "../database";
import { authenticate, AuthPayload } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimiter";
import { validateEmail, validatePassword } from "../utils/validation";

const router = Router();

// POST /api/auth/login
router.post("/login", loginLimiter, (req: Request, res: Response): void => {
  const { email, password } = req.body;

  // Validate input
  const emailErr = validateEmail(email);
  if (emailErr) {
    res.status(400).json({ error: emailErr });
    return;
  }
  const passErr = validatePassword(password);
  if (passErr) {
    res.status(400).json({ error: passErr });
    return;
  }

  const db = getDb();
  const user = db.prepare(
    "SELECT id, email, password_hash, role, status FROM users WHERE email = ?"
  ).get(email) as { id: string; email: string; password_hash: string; role: string; status: string } | undefined;

  // Use generic error message to prevent user enumeration
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Check if account is disabled
  if (user.status === "disabled") {
    res.status(401).json({ error: "Account is disabled. Contact an administrator." });
    return;
  }

  // Verify password
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Generate JWT
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

// POST /api/auth/logout
router.post("/logout", authenticate, (req: Request, res: Response): void => {
  const token = req.headers.authorization!.split(" ")[1];

  // Decode to get expiry, then blacklist until expiry
  const decoded = jwt.decode(token) as { exp: number };
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO token_blacklist (token, expires_at) VALUES (?, ?)").run(
    token,
    expiresAt
  );

  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", authenticate, (req: Request, res: Response): void => {
  const db = getDb();
  const user = db.prepare(
    "SELECT id, email, role, status FROM users WHERE id = ?"
  ).get(req.user!.userId) as { id: string; email: string; role: string; status: string } | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

export default router;
