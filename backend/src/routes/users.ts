import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { getDb } from "../database";
import { config } from "../config";
import { validateEmail, validatePassword, validateRole, validateStatus } from "../utils/validation";

const router = Router();

// All user management routes require admin role
router.use(authenticate, authorize("admin"));

// GET /api/users
router.get("/", (_req: Request, res: Response): void => {
  const db = getDb();
  const users = db.prepare("SELECT id, email, role, status, created_at FROM users").all();
  res.json(users);
});

// POST /api/users
router.post("/", (req: Request, res: Response): void => {
  const { email, password, role } = req.body;

  // Validate all fields
  const emailErr = validateEmail(email);
  if (emailErr) { res.status(400).json({ error: emailErr }); return; }

  const passErr = validatePassword(password);
  if (passErr) { res.status(400).json({ error: passErr }); return; }

  const roleErr = validateRole(role);
  if (roleErr) { res.status(400).json({ error: roleErr }); return; }

  const db = getDb();

  // Check for duplicate email
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(400).json({ error: "A user with this email already exists" });
    return;
  }

  const id = `usr-${crypto.randomUUID().split("-")[0]}`;
  const passwordHash = bcrypt.hashSync(password, config.bcryptRounds);

  db.prepare(
    "INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'active')"
  ).run(id, email, passwordHash, role);

  const created = db.prepare("SELECT id, email, role, status, created_at FROM users WHERE id = ?").get(id);
  res.status(201).json(created);
});

// PATCH /api/users/:id
router.patch("/:id", (req: Request, res: Response): void => {
  const { id } = req.params;
  const { role, status } = req.body;

  if (!role && !status) {
    res.status(400).json({ error: "Provide at least one field to update (role or status)" });
    return;
  }

  if (role) {
    const roleErr = validateRole(role);
    if (roleErr) { res.status(400).json({ error: roleErr }); return; }
  }

  if (status) {
    const statusErr = validateStatus(status);
    if (statusErr) { res.status(400).json({ error: statusErr }); return; }
  }

  const db = getDb();

  const existing = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(id) as
    { id: string; role: string; status: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Admin users cannot be disabled or demoted
  if (existing.role === "admin") {
    if (status && status === "disabled") {
      res.status(400).json({ error: "Admin users cannot be disabled" });
      return;
    }
    if (role && role !== "admin") {
      res.status(400).json({ error: "Admin users cannot be demoted" });
      return;
    }
  }

  // Build dynamic update
  const updates: string[] = [];
  const values: any[] = [];

  if (role) { updates.push("role = ?"); values.push(role); }
  if (status) { updates.push("status = ?"); values.push(status); }

  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT id, email, role, status, created_at FROM users WHERE id = ?").get(id);
  res.json(updated);
});

// DELETE /api/users/:id
router.delete("/:id", (req: Request, res: Response): void => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user!.userId === id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const db = getDb();

  const existing = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(id) as
    { id: string; role: string; status: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Admin users cannot be deleted
  if (existing.role === "admin") {
    res.status(400).json({ error: "Admin users cannot be deleted" });
    return;
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ message: "User deleted" });
});

export default router;
