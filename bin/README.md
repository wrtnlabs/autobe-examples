# `bin/` — AutoView Again helper scripts

Tools used by the AutoView Again sidecar protocol.

## `autoview-again-agent`

Phase 1 (inventory) + Phase 2 (journey selection) deterministic implementation.

Reads an AutoBe-generated backend project and emits
`{project}/frontend/docs/autoview-agent-plan.md` describing actors, resources,
workflow verbs, risk signals, and 4–8 recommended journeys.

```bash
bin/autoview-again-agent <path-to-backend-project>
```

Example:

```bash
bin/autoview-again-agent openai/gpt-5.4/erp
```

### What it does

- Walks `src/api/functional/{prefix}/` to extract:
  - actors (from `auth/{actor}/` subdirectories)
  - resources per actor + global resources
  - operation verbs per resource
- Tags workflow-significant verbs (`approve`, `reject`, `submit`, …) against an
  allowlist.
- Inspects `src/api/structures/*.ts` for risk signals:
  - empty `{};` DTO declarations
  - `null | null` field declarations
  - approval/moderation/audit-shape resources
- Picks 4–8 journey candidates per AGENT_DESIGN §5 decision rules
  (P1 happy path, P2 null|null reject/cancel, P3 empty-`{}` touched, P4 approval queue,
  P5 actor-owned `my X`, P7 audit/log).
- Emits a deterministic plan document.

### What it does NOT do

- Not run any LLM call.
- Not run Phase 0 measurements or Phase 3 scaffolding (those belong to the
  separate wrapper `bin/autoview-again`, when present).
- Not write or modify `frontend/docs/api-issues.md` — the wrapper-prefilled
  baseline (DTO measurements, sort encoding inventory) is preserved verbatim.
- Not generate any frontend code (mock store, adapters, pages, Playwright).
  Phases 4–8 of the protocol are out of scope for this script.

### Prerequisites

The target project must contain:
- `src/api/functional/{prefix}/` with at least one `auth/{actor}/index.ts`
- `src/api/structures/*.ts` (optional, but risk signal detection is skipped without it)
- A `frontend/` directory at the project root (the script writes the plan there)

If `bin/autoview-again` (Phase 0+3 wrapper) is available, run it first to scaffold
`frontend/`. Otherwise create at least an empty `frontend/docs/` directory.

### Output

Single file: `{project}/frontend/docs/autoview-agent-plan.md`

This file is the input contract for Phase 4 (mock store) generation, whether
that is performed manually, by a future LLM-driven agent, or by another tool.
The plan is fully deterministic and should be regenerated whenever
`src/api/` changes.

### Determinism

- Resource walk uses sorted `find` output and resorts the resulting TSV.
- Journey selection rules use stable tie-breakers (depth-1 preferred over
  nested paths; alphabetical order within the same depth).
- Same input ⇒ same plan, byte-for-byte (modulo the timestamp header).
