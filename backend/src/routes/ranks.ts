import { Router } from "express";

// Batch rank lookup — implemented in M4
export const ranksRouter = Router();

ranksRouter.post("/", (_req, res) => {
  res.json({ message: "Batch rank lookup — coming in M4" });
});
