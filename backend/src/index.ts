import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { initDb } from "./database";
import { apiLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth";
import eventsRoutes from "./routes/events";
import usersRoutes from "./routes/users";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "10kb" })); // Limit body size to prevent abuse
app.use(apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/users", usersRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler -- never leak internal details
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database and start server
initDb();
console.log("Database initialized");

app.listen(config.port, () => {
  console.log(`PenguWave API running on http://localhost:${config.port}`);
});
