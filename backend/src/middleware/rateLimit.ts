import { Request, Response, NextFunction } from "express";

// Simple sliding-window rate limiter stored in memory.
// Good enough for a single-process backend; swap for Redis if you scale out.
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // 30 requests per IP per minute

// Prune expired entries every 5 minutes so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, w] of windows) {
    if (w.resetAt < now) windows.delete(key);
  }
}, 5 * 60_000).unref(); // .unref() so this timer doesn't keep the process alive

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  let w = windows.get(ip);

  if (!w || w.resetAt < now) {
    w = { count: 1, resetAt: now + WINDOW_MS };
    windows.set(ip, w);
    return next();
  }

  w.count++;
  if (w.count > MAX_REQUESTS) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  next();
}
