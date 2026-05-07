import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getRankByPuuid, Platform } from "../services/riot";
import { rateLimit } from "../middleware/rateLimit";

export const ranksRouter = Router();

ranksRouter.use(rateLimit);

// Ranks are considered fresh for 4 hours.
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

function isStale(updatedAt: Date | null): boolean {
  if (!updatedAt) return true;
  return Date.now() - updatedAt.getTime() > CACHE_TTL_MS;
}

// POST /api/ranks
// Body: { usernames: string[] }
// Response: { [twitchLogin: string]: { tier: string; rank: string; lp: number } | null }
//
// Returns null for usernames that haven't opted in.
// Stale cache entries are refreshed in the background so this response stays fast.
ranksRouter.post("/", async (req, res) => {
  const { usernames } = req.body as { usernames?: unknown };

  if (!Array.isArray(usernames) || usernames.length === 0) {
    res.status(400).json({ error: "usernames must be a non-empty array" });
    return;
  }

  // Normalise to lowercase — Twitch logins are case-insensitive
  const logins = (usernames as string[])
    .filter((u) => typeof u === "string")
    .map((u) => u.toLowerCase())
    .slice(0, 100); // hard cap — extension sends at most ~30, but be safe

  const rows = await prisma.linkedAccount.findMany({
    where: { twitchLogin: { in: logins } },
  });

  // Build the response from cached data
  const result: Record<string, { tier: string; rank: string; lp: number } | null> = {};
  for (const login of logins) {
    result[login] = null;
  }
  for (const row of rows) {
    result[row.twitchLogin] =
      row.cachedTier && row.cachedRank && row.cachedLp !== null
        ? { tier: row.cachedTier, rank: row.cachedRank, lp: row.cachedLp }
        : null;
  }

  // Respond immediately with cached data, then refresh stale rows in the background
  res.json(result);

  const stale = rows.filter((r) => isStale(r.rankUpdatedAt));
  for (const row of stale) {
    getRankByPuuid(row.riotPuuid, row.region as Platform)
      .then(async (rank) => {
        await prisma.linkedAccount.update({
          where: { id: row.id },
          data: {
            cachedTier: rank?.tier ?? null,
            cachedRank: rank?.rank ?? null,
            cachedLp: rank?.lp ?? null,
            rankUpdatedAt: new Date(),
          },
        });
      })
      .catch(() => {
        // Swallow errors — stale cache is fine, we'll retry next request
      });
  }
});
