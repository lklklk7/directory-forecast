import { Router } from "express";

// Twitch OAuth routes — implemented in M2
export const authRouter = Router();

authRouter.get("/twitch", (_req, res) => {
  res.json({ message: "Twitch OAuth — coming in M2" });
});

authRouter.get("/twitch/callback", (_req, res) => {
  res.json({ message: "Twitch OAuth callback — coming in M2" });
});
