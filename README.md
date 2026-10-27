# AutoCheck - AI vehicle history (Next.js + TypeScript)

Enter a VIN -> specs, recalls/complaints (NHTSA), accidents, countries, odometer rollback check, AI risk verdict (Claude).

## Run
    npm install
    cp .env.example .env.local   # optional keys
    npm run dev

## Deploy to Vercel
    npm i -g vercel && vercel        # or import the repo at vercel.com/new
Add env vars in Vercel: ANTHROPIC_API_KEY, (optional) ANTHROPIC_MODEL, HISTORY_API_URL, HISTORY_API_KEY.

## Real worldwide history data
No free source covers accidents / cross-border history for all countries. Without `HISTORY_API_URL`
the history section is **DEMO sample data** (clearly bannered). Plug a paid provider (Carfax, AutoCheck,
VinAudit, AutoDNA, national registries) into `lib/history.ts` -> `normalize()`.
