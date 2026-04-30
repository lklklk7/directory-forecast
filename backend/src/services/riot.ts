// Riot API regions come in two flavours:
// - Platform (na1, euw1, kr, …) used by summoner-v4 and league-v4
// - Routing (americas, europe, asia, sea) used by account-v1
//
// We accept the platform from the user and derive the routing value here.

export type Platform =
  | "na1"
  | "euw1"
  | "eune1"
  | "kr"
  | "jp1"
  | "br1"
  | "la1"
  | "la2"
  | "oc1"
  | "tr1"
  | "ru";

export interface RankInfo {
  tier: string;
  rank: string;
  lp: number;
}

const ROUTING: Record<Platform, string> = {
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  euw1: "europe",
  eune1: "europe",
  tr1: "europe",
  ru: "europe",
  kr: "asia",
  jp1: "asia",
  oc1: "sea",
};

async function riotFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "X-Riot-Token": process.env.RIOT_API_KEY! },
  });
  return res;
}

// Step 1: Riot ID (name + tag) → PUUID
export async function getPuuid(
  gameName: string,
  tagLine: string,
  platform: Platform
): Promise<string | null> {
  const routing = ROUTING[platform];
  const res = await riotFetch(
    `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Riot account-v1 error: ${res.status}`);
  const data = (await res.json()) as { puuid: string };
  return data.puuid;
}

// Step 2: PUUID → encrypted summoner ID
async function getSummonerId(
  puuid: string,
  platform: Platform
): Promise<string | null> {
  const res = await riotFetch(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Riot summoner-v4 error: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

// Step 3: summoner ID → Solo Queue rank (null if unranked)
async function getSoloRank(
  summonerId: string,
  platform: Platform
): Promise<RankInfo | null> {
  const res = await riotFetch(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`
  );
  if (!res.ok) throw new Error(`Riot league-v4 error: ${res.status}`);
  const entries = (await res.json()) as {
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
  }[];

  const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
  if (!solo) return null;
  return { tier: solo.tier, rank: solo.rank, lp: solo.leaguePoints };
}

// Refresh rank for an already-stored PUUID (skips account-v1 lookup)
export async function getRankByPuuid(
  puuid: string,
  platform: Platform
): Promise<RankInfo | null> {
  const summonerId = await getSummonerId(puuid, platform);
  if (!summonerId) return null;
  return getSoloRank(summonerId, platform);
}

// Combined: fetch PUUID + rank in one call
export async function getRankByRiotId(
  gameName: string,
  tagLine: string,
  platform: Platform
): Promise<{ puuid: string; rank: RankInfo | null } | null> {
  const puuid = await getPuuid(gameName, tagLine, platform);
  if (!puuid) return null;

  const summonerId = await getSummonerId(puuid, platform);
  if (!summonerId) return { puuid, rank: null };

  const rank = await getSoloRank(summonerId, platform);
  return { puuid, rank };
}
