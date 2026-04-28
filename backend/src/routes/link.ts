import { Router } from "express";

// Riot account linking — implemented in M3
export const linkRouter = Router();

linkRouter.post("/", (_req, res) => {
  res.json({ message: "Riot account linking — coming in M3" });
});
