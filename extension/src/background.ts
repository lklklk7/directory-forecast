// Background service worker (MV3).
// Service workers terminate after ~30s of inactivity — no in-memory state.
// M6+ adds message handling if the content script needs a network relay.

chrome.runtime.onInstalled.addListener(() => {
  console.log("[TwitchRankBadges] extension installed");
});
