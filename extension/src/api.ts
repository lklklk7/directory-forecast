export interface RankEntry {
  tier: string;
  rank: string;
  lp: number;
}

export type RankMap = Record<string, RankEntry | null>;

export async function fetchRanks(
  backendUrl: string,
  usernames: string[]
): Promise<RankMap> {
  try {
    const res = await fetch(`${backendUrl}/api/ranks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames }),
    });
    if (!res.ok) return {};
    return (await res.json()) as RankMap;
  } catch {
    // Backend unreachable — fail silently, badges just won't appear
    return {};
  }
}
