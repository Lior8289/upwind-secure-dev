import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { getDb } from "../database";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  // Check if token has been blacklisted (logged out)
  const db = getDb();
  const blacklisted = db.prepare("SELECT token FROM token_blacklist WHERE token = ?").get(token);
  if (blacklisted) {
    res.status(401).json({ error: "Token has been invalidated" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
