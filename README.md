# Outreach Dashboard

A live analytics dashboard for your cold outreach across **Instantly** (email) and
**HeyReach** (LinkedIn). It shows:

- **Prospects** — the people who **opened** or **replied**, unified across both
  platforms, with search + filters. This is the home tab.
- **Analytics** — combined KPIs (sent, open rate, reply rate, connections) plus a
  per-platform breakdown.
- **Campaigns** — performance per campaign for both email and LinkedIn.

Data is fetched **live** from each platform's API on every load. Your API keys are
read only on the server (Next.js route handlers) and are never exposed to the browser.

Fully responsive: tables on desktop, cards on mobile.

## 1. Configure your API keys (local)

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and paste your two keys:

- `INSTANTLY_API_KEY` — Instantly → Settings → Integrations → **API Keys** (create a
  v2 key; read scope is enough).
- `HEYREACH_API_KEY` — HeyReach → Settings → Integrations → **Public API**.

## 2. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 3. Deploy free on Netlify

1. Push this folder to a GitHub repo (or use the Netlify CLI / drag-and-drop).
2. In Netlify: **Add new site → Import from Git**, pick the repo. Netlify
   auto-detects Next.js — no build settings to change.
3. **Site settings → Environment variables** → add:
   - `INSTANTLY_API_KEY`
   - `HEYREACH_API_KEY`
4. Deploy. You'll get a public `https://<your-site>.netlify.app` URL that works on
   phone and desktop.

> Redeploy (or "Clear cache and deploy") after adding env vars so they take effect.

## Notes on the data

- **Opens** only exist for email (Instantly). LinkedIn (HeyReach) has no open
  tracking, so those cells show `—`.
- **Replied** prospects are detected from Instantly's reply filter and from
  HeyReach's inbox (an incoming message = a reply).
- Rates (open %, reply %) are computed in-app; the APIs return raw counts.
- If one platform's key is missing or its API errors, the dashboard still loads the
  other platform and shows a small warning banner.

## Tech

Next.js (App Router) · React · Tailwind CSS · TypeScript. All API access is in
`src/lib/` (`instantly.ts`, `heyreach.ts`, `dashboard.ts`); the single API route is
`src/app/api/dashboard/route.ts`.
