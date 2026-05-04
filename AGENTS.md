<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Store Details — agent guide

## Stack
- Next.js 16.2.4 (App Router), React 19, TypeScript 5, Tailwind CSS v4
- SQLite via `better-sqlite3` (WAL mode), CSV parsing via `papaparse`
- Charts via `recharts` v3

## Commands
| Command | What |
|---------|------|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run lint` | ESLint (flat config) |
| `npm run seed` | **Seed DB from CSV** — must run before data is available |

**Required order on fresh clone:** `npm install` → `npm run seed` → `npm run dev`

## Seed & data
- CSV sources live in `store-data/` (5 files: Books_Invoice, Extension_Users, Store_Subscriptions, Store_Transactions, Store_Commissions)
- `npm run seed` runs `src/scripts/seed.ts` via `tsx` — reads all CSVs, upserts into SQLite
- CSV→DB field mapping is defined in `CSV_CONFIG` (`src/lib/types.ts:67`)
- DB file: `store.db` in project root (configurable via `DATABASE_PATH` env var)
- Legacy reload script at `scripts/reload-data.js` (standalone, uses CJS — prefer `npm run seed`)

## Architecture
- **Two pages:** `/` (analytics dashboard, recharts) and `/data` (data viewer, filterable table)
- **5 API routes** under `src/app/api/`: `data`, `analytics`, `customers`, `statuses`, `upload`
- **DB adapter** at `src/lib/adapters/sqlite.ts` — imported via `src/lib/db.ts` (swap adapter for different SQL engines)
- **TypeScript path alias:** `@/*` → `src/*`

## Notable
- Extension_Users uses composite key (`Extension User Owner.id` + `First Install Date`)
- `Store_Subscriptions` rows with `Business Category = Zoho` are remapped to `Store_Commissions` (service type)
- No test suite, no CI/CD, no pre-commit hooks
