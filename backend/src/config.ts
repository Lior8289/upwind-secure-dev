import path from "path";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  jwtSecret: process.env.JWT_SECRET || "penguwave-dev-secret-change-in-production",
  jwtExpiresIn: "8h",
  bcryptRounds: 12,
  dbPath: path.join(__dirname, "..", "data", "penguwave.db"),
  eventsPath: path.join(__dirname, "..", "..", "data", "mock_events.json"),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
