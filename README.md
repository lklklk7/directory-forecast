# Twitch Rank Badges

A Chrome extension that overlays League of Legends rank badges on streamer thumbnails in the Twitch directory — so viewers can see a streamer's rank at a glance without clicking into their stream.

![Extension preview showing rank badges on Twitch stream cards](https://placehold.co/800x400?text=Extension+Preview)

---

## What it does

When browsing `twitch.tv/directory/category/league-of-legends`, the extension injects a small rank badge (e.g. **Diamond II**, **Challenger**) onto each stream card for any streamer who has opted in.

Streamers opt in once via a web page — they log in with Twitch and connect their Riot account. From that point on, their rank is automatically fetched and cached server-side, and displayed to anyone with the extension installed.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)         │
│  Content script reads the Twitch DOM,   │
│  batches streamer usernames, fetches    │
│  ranks, and injects badge elements.     │
│  MutationObserver handles infinite      │
│  scroll as new cards load.              │
└────────────────┬────────────────────────┘
                 │ POST /api/ranks
                 ▼
┌─────────────────────────────────────────┐
│  Express Backend (Node.js + TypeScript) │
│                                         │
│  /auth/twitch      Twitch OAuth flow    │
│  /api/link         Riot account linking │
│  /api/ranks        Batch rank lookup    │
│  /link             Streamer opt-in page │
└──────────┬──────────────────┬───────────┘
           │                  │
           ▼                  ▼
     PostgreSQL          Riot Games API
     (Prisma ORM)        (cached 4 hrs)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3, TypeScript, Webpack |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | Twitch OAuth 2.0 |
| External API | Riot Games League-v4 |

---

## Key technical decisions

**Defensive DOM selection**
Twitch obfuscates and frequently regenerates CSS class names. The extension never selects by class name — it targets elements by stable `data-a-target` attributes and href patterns, making it resilient to Twitch UI deploys.

**Manifest V3 service worker**
MV3 service workers terminate after ~30s of inactivity and cannot hold in-memory state. The extension is designed around this: all state lives in the DOM (`data-rank-badge` attributes) or in `chrome.storage`, not in JavaScript variables.

**Respond-then-refresh caching**
The `/api/ranks` endpoint always responds immediately from the database cache. If any cached entries are older than 4 hours, they are refreshed in the background *after* the response is sent — so the extension never waits on a Riot API call.

**Batched requests**
The content script collects all visible streamer usernames into a single `POST /api/ranks` call rather than one request per card, keeping network overhead minimal regardless of how many streamers are on screen.

**Rate limiting**
The ranks endpoint enforces a sliding-window rate limit (30 requests/minute per IP) in middleware, protecting the backend from abuse without a third-party dependency.

---

## Project structure

```
directory-forecast/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # linked_accounts table
│   └── src/
│       ├── app.ts               # Express factory (CORS, session, routes)
│       ├── index.ts             # Server entry point
│       ├── routes/
│       │   ├── auth.ts          # Twitch OAuth: /auth/twitch + callback
│       │   ├── link.ts          # POST /api/link — Riot account linking
│       │   ├── ranks.ts         # POST /api/ranks — batch rank lookup
│       │   └── pages.ts         # Streamer opt-in web page
│       ├── services/
│       │   └── riot.ts          # Riot API: account-v1, summoner-v4, league-v4
│       ├── middleware/
│       │   ├── requireAuth.ts   # Session auth guard
│       │   └── rateLimit.ts     # Sliding-window rate limiter
│       └── lib/
│           └── prisma.ts        # Prisma client singleton
└── extension/
    ├── public/
    │   └── manifest.json        # Chrome MV3 manifest
    └── src/
        ├── content.ts           # DOM targeting, badge injection, MutationObserver
        ├── api.ts               # fetchRanks() — POST /api/ranks wrapper
        ├── styles.ts            # Badge CSS injected as <style> tag
        └── background.ts        # MV3 service worker
```

---

## Running locally

### Prerequisites
- Node.js 18+
- PostgreSQL 16+
- A [Twitch developer application](https://dev.twitch.tv/console) (client ID + secret)
- A [Riot Games API key](https://developer.riotgames.com)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your credentials
npx prisma migrate dev --name init
npm run dev
# → Backend running on http://localhost:3000
```

### Extension

```bash
cd extension
npm install
npm run build          # or: npm run dev  (watch mode)
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/dist/` folder

### Opt-in flow (streamer side)

1. Visit `http://localhost:3000/link`
2. Log in with Twitch
3. Enter your Riot Name, Tag, and region
4. Your rank badge will now appear on the directory

---

## How the streamer opt-in flow works

```
Streamer visits /link
  → clicks "Log in with Twitch"
  → redirected to Twitch OAuth consent screen
  → Twitch redirects back to /auth/twitch/callback
  → backend exchanges auth code for access token
  → backend fetches Twitch user identity (/helix/users)
  → session created, streamer redirected to /link form
  → streamer enters Riot Name + Tag + region
  → backend calls Riot account-v1 → PUUID
  → backend calls Riot summoner-v4 → summoner ID
  → backend calls Riot league-v4 → Solo Queue rank
  → row upserted in linked_accounts table
  → success page shows confirmed rank
```

---

## Database schema

```sql
linked_accounts (
  id              TEXT PRIMARY KEY,
  twitch_id       TEXT UNIQUE,   -- Twitch user ID
  twitch_login    TEXT,          -- Twitch username (lowercase)
  riot_puuid      TEXT,          -- Riot PUUID
  region          TEXT,          -- e.g. na1, euw1, kr
  cached_tier     TEXT,          -- e.g. DIAMOND
  cached_rank     TEXT,          -- e.g. II
  cached_lp       INTEGER,       -- League Points
  rank_updated_at TIMESTAMP,     -- last Riot API fetch
  created_at      TIMESTAMP
)
```

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing session cookies |
| `TWITCH_CLIENT_ID` | From dev.twitch.tv/console |
| `TWITCH_CLIENT_SECRET` | From dev.twitch.tv/console |
| `TWITCH_REDIRECT_URI` | Must match your Twitch app settings |
| `RIOT_API_KEY` | From developer.riotgames.com |
| `BASE_URL` | Public URL of this backend |
| `FRONTEND_URL` | Where to redirect after OAuth (same as BASE_URL for MVP) |

---

## Out of scope for MVP

- Chat badges (a separate surface owned by extensions like EloWard)
- Games other than League of Legends
- Rank badges on individual stream pages
- Real-time rank updates
- Chrome Web Store publishing
