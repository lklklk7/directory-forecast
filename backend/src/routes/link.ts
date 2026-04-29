import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getRankByRiotId, Platform } from "../services/riot";
import { prisma } from "../lib/prisma";

export const linkRouter = Router();

linkRouter.use(requireAuth);

const VALID_PLATFORMS = new Set<Platform>([
  "na1", "euw1", "eune1", "kr", "jp1",
  "br1", "la1", "la2", "oc1", "tr1", "ru",
]);

linkRouter.post("/", async (req, res) => {
  const { riotName, riotTag, region } = req.body as {
    riotName?: string;
    riotTag?: string;
    region?: string;
  };

  if (!riotName || !riotTag || !region) {
    res.status(400).json({ error: "riotName, riotTag, and region are required" });
    return;
  }

  if (!VALID_PLATFORMS.has(region as Platform)) {
    res.status(400).json({ error: `Invalid region. Valid values: ${[...VALID_PLATFORMS].join(", ")}` });
    return;
  }

  const result = await getRankByRiotId(riotName, riotTag, region as Platform);

  if (!result) {
    res.status(404).json({ error: "Riot account not found. Check your name, tag, and region." });
    return;
  }

  await prisma.linkedAccount.upsert({
    where: { twitchId: req.session.userId! },
    create: {
      twitchId: req.session.userId!,
      twitchLogin: req.session.userLogin!,
      riotPuuid: result.puuid,
      region,
      cachedTier: result.rank?.tier ?? null,
      cachedRank: result.rank?.rank ?? null,
      cachedLp: result.rank?.lp ?? null,
      rankUpdatedAt: new Date(),
    },
    update: {
      twitchLogin: req.session.userLogin!,
      riotPuuid: result.puuid,
      region,
      cachedTier: result.rank?.tier ?? null,
      cachedRank: result.rank?.rank ?? null,
      cachedLp: result.rank?.lp ?? null,
      rankUpdatedAt: new Date(),
    },
  });

  res.json({
    success: true,
    rank: result.rank
      ? `${result.rank.tier} ${result.rank.rank} (${result.rank.lp} LP)`
      : "Unranked",
  });
});
