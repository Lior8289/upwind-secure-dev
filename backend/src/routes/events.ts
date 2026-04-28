import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { loadEvents } from "../database";

const router = Router();

let cachedEvents: any[] | null = null;

function getEvents(): any[] {
  if (!cachedEvents) {
    cachedEvents = loadEvents();
  }
  return cachedEvents;
}

// GET /api/events
router.get("/", authenticate, (req: Request, res: Response): void => {
  const events = getEvents();
  const user = req.user!;

  // Admins see all events; other roles see only events assigned to them
  if (user.role === "admin") {
    res.json(events);
    return;
  }

  const userEvents = events.filter((e) => e.userId === user.userId);
  res.json(userEvents);
});

// GET /api/events/:id
router.get("/:id", authenticate, (req: Request, res: Response): void => {
  const eventId = req.params.id;

  // Validate event ID format (alphanumeric + hyphens only)
  if (!/^[\w-]+$/.test(eventId)) {
    res.status(400).json({ error: "Invalid event ID format" });
    return;
  }

  const events = getEvents();
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  // Non-admin users can only view their own events
  const user = req.user!;
  if (user.role !== "admin" && event.userId !== user.userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(event);
});

export default router;
