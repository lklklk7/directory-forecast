import { injectStyles } from "./styles";
import { fetchRanks } from "./api";
import type { RankMap } from "./api";

// Injected by webpack DefinePlugin at build time.
// Set BACKEND_URL env var when building for production.
declare const BACKEND_URL: string;
const BACKEND = BACKEND_URL;
const BADGE_ATTR = "data-rank-badge";

// Extract the Twitch login from a stream card.
// We look for the <a> whose href is "/<login>" inside the card — this is
// structurally stable even when Twitch regenerates class names.
function getLoginFromCard(card: Element): string | null {
  // Stream cards link to the channel via an anchor with href="/<login>"
  const anchor = card.querySelector<HTMLAnchorElement>(
    'a[href^="/"][href*="/"]'
  );
  if (!anchor) return null;

  const href = anchor.getAttribute("href") ?? "";
  // Channel hrefs look like "/streamerlogin" — single path segment, no extra slashes
  const match = href.match(/^\/([a-zA-Z0-9_]{3,25})$/);
  return match ? match[1].toLowerCase() : null;
}

// Find all stream cards currently in the DOM that haven't been badged yet.
function getUnbadgedCards(): Element[] {
  // Stream cards are article elements or divs wrapping a thumbnail + info.
  // The most reliable selector: elements containing both a thumbnail image
  // and a channel link, identified by the data-a-target attribute Twitch uses.
  const candidates = document.querySelectorAll<Element>(
    '[data-a-target="preview-card-image-link"],' +
    '[data-a-target="preview-card-channel-link"]'
  );

  // Walk up to the common card ancestor (3 levels is enough for Twitch's DOM)
  const cards = new Set<Element>();
  for (const el of candidates) {
    let node: Element | null = el;
    for (let i = 0; i < 4; i++) {
      node = node?.parentElement ?? null;
      if (node && (node.tagName === "ARTICLE" || node.getAttribute("data-target") === "stream-card")) {
        break;
      }
    }
    if (node && !node.hasAttribute(BADGE_ATTR)) {
      cards.add(node);
    }
  }
  return [...cards];
}

// Inject a badge element onto a card
function injectBadge(card: Element, rank: RankMap[string]) {
  card.setAttribute(BADGE_ATTR, "1");

  if (!rank) return; // opted-out streamer — mark as processed but show nothing

  const badge = document.createElement("div");
  badge.className = "trb-badge";
  badge.setAttribute("data-tier", rank.tier.toLowerCase());
  badge.textContent = `${toTitleCase(rank.tier)} ${rank.rank}`;

  // The thumbnail container is the first child — we overlay the badge on it
  const thumbnail = card.querySelector('[data-a-target="preview-card-image-link"]');
  const target = thumbnail ?? card;
  (target as HTMLElement).style.position = "relative";
  target.appendChild(badge);
}

function toTitleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function badgeCards(cards: Element[]) {
  if (cards.length === 0) return;

  const loginToCard = new Map<string, Element>();
  for (const card of cards) {
    const login = getLoginFromCard(card);
    if (login) loginToCard.set(login, card);
    // Mark immediately so the observer doesn't re-queue while we await
    card.setAttribute(BADGE_ATTR, "pending");
  }

  if (loginToCard.size === 0) return;

  const ranks = await fetchRanks(BACKEND, [...loginToCard.keys()]);

  for (const [login, card] of loginToCard) {
    injectBadge(card, ranks[login] ?? null);
  }
}

// Debounce — coalesce rapid MutationObserver callbacks into one batch
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleBadge() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    badgeCards(getUnbadgedCards());
  }, 300);
}

function init() {
  injectStyles();

  // Badge cards already on the page
  badgeCards(getUnbadgedCards());

  // Watch for new cards added by infinite scroll
  const observer = new MutationObserver(scheduleBadge);
  observer.observe(document.body, { childList: true, subtree: true });
}

// Wait for the directory grid to be present before running
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
