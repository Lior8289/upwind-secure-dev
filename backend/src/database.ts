import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { config } from "./config";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function initDb(): Database.Database {
  // Ensure data directory exists
  const dataDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(config.dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables (DDL uses exec, not prepare)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'analyst', 'viewer')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS token_blacklist (
      token TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL
    );
  `);

  // Seed default users if table is empty
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (count.count === 0) {
    seedUsers();
  }

  return db;
}

function seedUsers() {
  const insert = db.prepare(
    "INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)"
  );

  const seedData = [
    { id: "usr-001", email: "admin@penguwave.io", password: "admin123", role: "admin", status: "active" },
    { id: "usr-002", email: "analyst@penguwave.io", password: "pass456", role: "analyst", status: "active" },
    { id: "usr-003", email: "viewer@penguwave.io", password: "view789", role: "viewer", status: "disabled" },
  ];

  const insertMany = db.transaction(() => {
    for (const user of seedData) {
      const hash = bcrypt.hashSync(user.password, config.bcryptRounds);
      insert.run(user.id, user.email, hash, user.role, user.status);
    }
  });

  insertMany();
  console.log(`Seeded ${seedData.length} default users`);
}

export function loadEvents(): any[] {
  const raw = fs.readFileSync(config.eventsPath, "utf-8");
  return JSON.parse(raw);
}
