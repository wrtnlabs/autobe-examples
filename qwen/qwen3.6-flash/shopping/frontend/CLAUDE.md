# AutoView Again — shopping (wrapper-bootstrapped)

This frontend was scaffolded by `scripts/autoview-again scaffold /Users/yongrean/Downloads/autobe-examples/qwen/qwen3.6-flash/shopping`.
Continue with Phase 1+ per the AutoView Again sidecar spec.

- Generated at: 2026-05-14T06:01:16Z
- Allocated port: **3101**
- Phase 0 source: **raw** (/Users/yongrean/Downloads/autobe-examples/raw/qwen/qwen3.6-flash/shopping/interface.snapshots.json.gz)

## Phase 0 baseline (also recorded in docs/api-issues.md)

| Metric | Value |
|---|---|
| DTO total | 160 |
| Operation total | 161 |
| Actors | 0 |
| Empty DTO count | 2 |
| Empty type files | IEcommerceMallCartSession.ICreate, IEcommerceMallWishlistItem.IUpdate |
| `null \| null` hits | 0 |
| `null \| null` locations | (none) |
| `snake_case` field declarations | 354 |
| `camelCase` field declarations | 192 |
| camel/snake ratio | 54.2% |
| Sort encoding variants | 0 |
| Longest FK field (chars) | 33 |
| Longest FK field name | `ecommerce_mall_product_variant_id` |

## Run

```bash
corepack pnpm install
corepack pnpm exec next dev --hostname 127.0.0.1 --port 3101
corepack pnpm exec playwright test
```

## Next steps

1. Phase 1 — read `src/api/functional/` to inventory actors and resources.
   `scripts/autoview-again plan /Users/yongrean/Downloads/autobe-examples/qwen/qwen3.6-flash/shopping` produces a
   deterministic Phase 1+2 candidate plan at
   `frontend/docs/autoview-agent-plan.md`.
2. Phase 2 — pick 4-8 journeys (review the plan output).
3. Phase 4 — write `lib/sdk/mock/store.ts` with deterministic seed.
4. Phase 5 — adapters in `lib/sdk/{entity}.ts`.
5. Phase 6 — pages.
6. Phase 7 — Playwright tests.
7. Phase 8 — fill out `docs/api-issues.md` and write `docs/validation-summary.md`.
