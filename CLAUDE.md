# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EarlyBell (formerly Foega / Gene Finance) is a financial market analysis platform that detects unusual stock/crypto activity via options flow, volume spikes, and sentiment signals. Monorepo with a React frontend and Python FastAPI backend. User-facing brand is "EarlyBell" — internal code still uses `foega` in CSS variable names (`--foega-primary-color`) and localStorage key (`foega_watchlist`) to avoid breaking existing users.

## Development Commands

### Frontend (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build to dist/
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (FastAPI + Supabase)
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python main.py     # Uvicorn server at http://localhost:8000
```

Both servers must run simultaneously for full functionality. The frontend reads the API base URL from `import.meta.env.VITE_API_URL` (falls back to `http://127.0.0.1:8000`). See `frontend/.env.example`.

## Required Environment Variables (backend/.env)
See `backend/.env.example` for a template with placeholder values.
- `SUPABASE_URL` / `SUPABASE_KEY` — Supabase project credentials
- `FINNHUB_API_KEY` — News sentiment data
- `FRONTEND_URL` — Optional, appended to CORS origins if set (production Vercel domain `https://gene-finance.vercel.app` is hardcoded)
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — Optional, for email alerts on CRITICAL tickers
- `OPENROUTER_API_KEY` — **Must be set in Railway environment variables** for the News Intelligence feature to work. Get a key at https://openrouter.ai. Uses model `google/gemma-3-12b-it`. If missing, `analyze_headlines_with_ai()` logs a warning and skips silently — no crash.

## Architecture

### Backend (backend/)
- **main.py** — FastAPI app with all API endpoints, CORS config, Supabase integration, caching, and a background loop that refreshes data every hour
- **meme_detector.py** — Three-signal early warning system (options flow, volume spikes, Reddit/WSB social buzz via ApeWisdom) that scores tickers 0-10 and assigns alert levels (CRITICAL/HIGH/MEDIUM/LOW). Options signals are cached 4 hours per ticker in-memory (options flow doesn't change minute-to-minute). ApeWisdom data is cached for 10 minutes. Social matching is exact ticker symbol only (no name-field fallback). If a ticker isn't in ApeWisdom's top 100, social score is correctly 0.

Key API endpoints:
- `/alerts/scan` — Full 49-ticker scan (expensive, triggers API calls). XYZ (Block/SQ rebrand) was removed — confusing ticker symbol.
- `/alerts/cached` — Fast cached alerts from Supabase (used by frontend)
- `/trending/hype` — Z-score hype analysis across all tickers
- `/trending/cached_hype` — Fast cached hype data
- `/movers/predicted` — Composite mover score (40% early_warning + 40% z-score momentum + 20% price level bonus), labels BREAKOUT (>=4.0) / WATCH (>=2.0) / NEUTRAL, saves to `predicted_movers` table. Calls yfinance per ticker so it's slow — frontend should use `/movers/cached` instead.
- `/movers/cached` — Fast cached predicted movers from Supabase (used by frontend Scanner)
- `/premium/walk_forward/{ticker}` — Returns 501 Not Implemented (stub); frontend shows Coming Soon placeholder instead of calling this
- `/stock/{ticker}` — Single stock info via yfinance
- `POST /subscribe` — Upserts email + tickers array into `alert_subscriptions` table for CRITICAL-level email alerts
- `/polymarket/events` — Macro-relevant prediction market events from Polymarket's Gamma API, mapped to genuinely sensitive tickers via specific keyword phrases. 10-minute in-memory cache. Ticker mapping: fed rate/interest rate/fed chair/fed decision → SOFI, HOOD, COIN, BAC, JPM, GS, MS, WFC; recession → AAPL, MSFT, AMZN, GOOGL, META, NVDA; crypto regulation/ban/sec → COIN, HOOD; earnings → dynamically matched by ticker mention in question text only.
- `/debug/finnhub/{ticker}` — Tests Finnhub API for a single ticker with full diagnostic logging: API key status, request URL (masked key), HTTP response details, article count, first headline, and TextBlob sentiment result
- `/debug/social` — Debug endpoint returning raw ApeWisdom response: top 20 trending tickers, exact matches with our watchlist, and list of our tickers not in ApeWisdom
- `/debug/scan-status` — Shows both `meme_alerts` and `predicted_movers` tables: ticker counts, last/oldest update timestamps, and zero-price tickers

CORS: Hardcoded origins for localhost:5173, 127.0.0.1:5173, `https://gene-finance.vercel.app`, `https://earlybell.app`, and `https://www.earlybell.app`. `FRONTEND_URL` env var is dynamically appended if set, allowing additional domains without code changes.

Finnhub news/sentiment: `async_news_sentiment_and_volume()` computes date range dynamically per call (not at module load) so long-running servers always query the current 7-day window. Crypto tickers (containing `-`, e.g. `BTC-USD`) are skipped since Finnhub's company-news endpoint only supports stock symbols. Accepts `debug=True` for verbose logging (URL, HTTP status, response size, article count, sentiment). Logs a startup warning if `FINNHUB_API_KEY` is missing and skips Finnhub calls entirely (returns 0) rather than sending `token=None`. Auth errors (401/403) are logged separately from rate limits. After each scan, a per-ticker log shows article count and sentiment for tickers with news, plus a summary of how many tickers had news and the top 3 by article count.

Caching: 5-minute in-memory TTL for expensive endpoints; 10-minute TTL for Polymarket; background `scheduled_update_loop` runs hourly: `scan_for_alerts()` → `trending_hype()` → `predicted_movers()`. The `predicted_movers()` step is error-isolated so failures don't break the loop. Tickers returning $0 price from yfinance are skipped (not saved to Supabase); price fetch falls back to `history()` if `info` API is flaky. Finnhub calls have 1.5s rate-limit delays (~40/min, under 60/min limit) with failure count logging. After each scan, `send_critical_alert_emails()` sends SMTP emails to subscribed users for any CRITICAL-level tickers.

### Frontend (frontend/src/)
- **App.jsx** — Main shell with collapsible sidebar navigation (includes Feedback mailto link to dipbedford@gmail.com), view routing (landing/scanner/news/history/watchlist/about/premium), ticker detail modal (includes Polymarket section), Coming Soon premium placeholder, persistent "?" help FAB (bottom-right, all pages) that opens a HelpModal explaining alert levels, three signals with weights, predicted movers labels, heatmap, Polymarket badges, and a disclaimer. Landing page includes a 3-step "How It Works" section (scan → score → act). Fixed disclaimer footer on all pages ("Not financial advice..."). Modals are 700px min-width on desktop, 90vw on mobile. Sidebar nav: Scanner · News Radar · Alert History · Watchlist · How It Works · Premium Access.
- **Scanner.jsx** — Consolidated main view replacing MarketScanner, PredictedMovers, and HeatmapView. Fetches `/alerts/cached`, `/movers/cached`, and `/trending/cached_hype` simultaneously via Promise.all and merges by ticker. Top controls bar (sticky): [Cards|Heatmap] segmented toggle · Sort by (Early Warning / Predicted Mover / Price Change / Hype Score) · Show LOW button. Cards view: same layout as legacy MarketScanner (Options/Volume/Social/Insider signal bars, direction badge, Polymarket badge, earnings badge, expandable View Details) with Predicted Mover data added to View Details (mover score+label, 5d momentum, hype score, 52w high/round number flags). Heatmap view: sector grid identical to legacy HeatmapView, tiles show a secondary label reflecting the currently selected sort metric. Both views share the same merged dataset.
- **MarketScanner.jsx** — Legacy component kept but no longer routed to. Can be removed in a follow-up.
- **HeatmapView.jsx** — Legacy component kept but no longer routed to. Can be removed in a follow-up.
- **PredictedMovers.jsx** — Legacy component kept but no longer routed to. Can be removed in a follow-up.
- **WatchlistView.jsx** — Filtered view of watched tickers (stored in localStorage under `foega_watchlist`) with remove button and email alert subscription form
- **AlertDashboard.jsx** — Alert summary cards with detail modals

State management is local React hooks only (useState/useEffect). No router library — views are toggled via state. All data fetching happens once on component mount via `useEffect([])` — no frontend polling or intervals. The backend `scheduled_update_loop` handles hourly data refreshes; users reload the page to get fresh data. Polymarket events are fetched once in App.jsx and passed as props to child components (Scanner receives both `polymarketEvents` and `onTickerClick`).

### Supabase Tables
- **ticker_hype** — Stores hype scores per ticker
- **meme_alerts** — Stores alert scores, levels, and signal breakdowns per ticker
- **predicted_movers** — Stores mover scores, labels, momentum, and price level flags per ticker
- **alert_subscriptions** — Email alert subscriptions with email (unique), tickers array, and created_at timestamp (migration: `003_email_alerts.sql`)

### Styling
Dark navy theme. Page background: `#0f172a`, card backgrounds: `#1e293b`, elevated/hover surfaces: `#334155`, borders: `#334155`. Primary accent: `#22c55e` (green), secondary accent: `#ff9900` (amber). CSS variables defined in `App.css :root`. CSS files are colocated with their components. Sidebar collapses from 250px to 70px.

## Authentication (Stage 1 — Frontend Only)

Auth uses `@supabase/supabase-js` directly in the frontend — no backend JWT verification yet.

- **`frontend/src/supabaseClient.js`** — Creates and exports the Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **`frontend/src/AuthContext.jsx`** — React context providing `user`, `session`, `loading`, `signIn`, `signUp`, `signOut` via `useAuth()` hook. Wraps the entire app in `main.jsx`.
- **`frontend/src/AuthModal.jsx`** / **`AuthModal.css`** — Sign In / Sign Up modal matching EarlyBell design. Two-tab segmented control, form fields, success/error states, forgot password placeholder.
- **App.jsx sidebar** — Shows "Sign In" button when logged out (opens AuthModal). Shows truncated email + "Sign Out" when logged in. Auth section sits above the status bar.
- **Scanner blur gate** — Top 5 ticker rows are blurred with a `backdrop-filter: blur(6px)` overlay when the user is not logged in. Clicking the overlay opens AuthModal. A 32px login banner above the ticker list also links to AuthModal.
- **`backend/migrations/017_profiles.sql`** — `profiles` table (UUID PK referencing `auth.users`), with `email`, `watchlist_tickers TEXT[]`, `tier TEXT DEFAULT 'free'`. Row-level security enabled; trigger auto-creates a profile on signup.

### Required env vars (frontend)
Must be set in `frontend/.env` (local) and Vercel environment variables (production):
- `VITE_SUPABASE_URL` — same URL as `SUPABASE_URL` in the backend `.env`
- `VITE_SUPABASE_ANON_KEY` — same key as `SUPABASE_KEY` in the backend `.env`

### Stage 1 constraints
- Backend does **not** verify JWT tokens — auth is frontend-only

## Authentication (Stage 2 — Authenticated Watchlist & Account)

- **`frontend/src/useWatchlist.js`** — Custom hook managing both anonymous (localStorage) and authenticated (Supabase `profiles.watchlist_tickers`) watchlists. When user logs in, merges localStorage into Supabase (union, capped at `MAX_TICKERS = 3`). On logout, reverts to localStorage without clearing it. Used in Scanner, WatchlistView, and AccountView.
- **Max 3 tickers per free account** — enforced frontend-only in Stage 2 by `addTicker()` returning `{ error }` when at cap. Scanner shows inline `#f59e0b` message that auto-clears after 3 seconds.
- **`frontend/src/AccountView.jsx`** / **`AccountView.css`** — "My Account" page (only visible in nav when logged in): account info section (email, member since, FREE PLAN badge, sign out), watched tickers list (with live price/score from `/alerts/cached` and remove button), email alert preferences (threshold segmented control + alert email input, saves to `profiles`).
- **`backend/migrations/018_profiles_alert_prefs.sql`** — Adds `alert_threshold INT DEFAULT 5` and `alert_email TEXT` columns to `profiles`.
- **`send_watchlist_alerts(scan_results)`** — Async function in main.py, called after every scan alongside `send_critical_alert_emails`. Queries `profiles` table for users with non-zero `alert_threshold` and non-empty `watchlist_tickers`, sends SMTP email for each ticker that crossed the threshold. Uses `alert_email` if set, falls back to `email`.
- `profiles.alert_threshold` default is `5`, value `0` means alerts disabled.
- `profiles.alert_email` overrides auth email for alert delivery if set.

## Tech Notes
- No TypeScript — plain JavaScript (JSX)
- No test suite or testing framework configured
- No CI/CD pipelines
- Alert scoring weights: 40% options + 35% volume + 25% social (Reddit/WSB via ApeWisdom)
- Data sources: yfinance (free, no key), Finnhub (free tier with rate limits), ApeWisdom (free, no key), Polymarket Gamma API (free, no key)
