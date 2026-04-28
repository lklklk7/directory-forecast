import express from "express";
import cors from "cors";
import session from "express-session";
import { authRouter } from "./routes/auth";
import { ranksRouter } from "./routes/ranks";
import { linkRouter } from "./routes/link";

export function createApp() {
  const app = express();

  app.use(express.json());

  // Allow requests from the Chrome extension and the opt-in web page.
  // chrome-extension://* covers all extension origins in development.
  // In production, replace the regex with your specific extension ID.
  app.use(
    cors({
      origin: [
        /^chrome-extension:\/\//,
        process.env.FRONTEND_URL ?? "http://localhost:3000",
      ],
      credentials: true,
    })
  );

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
    })
  );

  app.use("/auth", authRouter);
  app.use("/api/ranks", ranksRouter);
  app.use("/api/link", linkRouter);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
