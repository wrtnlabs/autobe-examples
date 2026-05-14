# AutoView API Issues Report — shopping

## DTO Measurements (Phase 0 baseline)

Auto-recorded by `scripts/autoview-again phase0 --write-api-issues` at 2026-05-14T06:01:17Z.
Based on raw interface snapshots (/Users/yongrean/Downloads/autobe-examples/raw/qwen/qwen3.6-flash/shopping/interface.snapshots.json.gz).

| Metric | Value |
|---|---|
| Project | /Users/yongrean/Downloads/autobe-examples/qwen/qwen3.6-flash/shopping |
| DTO total | 160 |
| Operation total | 161 |
| Actors | 0 |
| Empty DTO count | 2 |
| Empty type files | IEcommerceMallCartSession.ICreate,IEcommerceMallWishlistItem.IUpdate |
| `null \| null` hits | 0 |
| `null \| null` locations | (none) |
| `snake_case` field declarations | 354 |
| `camelCase` field declarations | 192 |
| camel/snake ratio | 54.2% (>100% = camel-dominant; 0% = snake-dominant) |
| Sort encoding variants | 0 |
| Longest FK field (chars) | 33 |
| Longest FK field name | `ecommerce_mall_product_variant_id` |

### Sort encoding inventory

```
(none)
```

---

## API/SDK Usage Problems (project-specific)

### 1. Duplicate category endpoints under conflicting names

- Two endpoints serve the same `IEcommerceMallShopCategory` page response:
  - `PATCH /ecommerceMall/categories` (functional dir `api/functional/ecommerceMall/categories/`, response `IPageIEcommerceMallShopCategory.ISummary`)
  - `PATCH /ecommerceMall/shop-categories` (functional dir `api/functional/ecommerceMall/shop_categories/`, response `IPageIEcommerceMallShopCategory.ISummary`)
- A separate type `IEcommerceMallCategory` *also* exists in `api/structures/` with its own fields, but no endpoint returns it as a list response.
- Frontend developer cost: cannot tell whether to call `categories` or `shop-categories`, and the response type name (`ShopCategory`) does not match the path token (`categories`). Adapter chooses `shop_categories` and avoids `categories` to keep the entity name consistent with the path.
- Severity: P1.

### 2. Mixed path casing for one resource

- Functional directory: `api/functional/ecommerceMall/shop_categories/` (snake_case).
- METADATA path constant inside that file: `/ecommerceMall/shop-categories` (kebab-case).
- Higher-level usage / Phase 1 plan: `shopCategories` (camelCase).
- Three different casings for a single resource confuse the URL → directory → identifier mapping.
- Severity: P2.

### 3. `IRequest.category_id` actually means "parent category id"

- `IEcommerceMallShopCategory.IRequest.category_id` carries a doc string that explicitly says "Optional UUID of the parent category. If provided, returns subcategories of this category."
- The field name `category_id` does not encode that semantic — it reads as "this entity's own id" and is therefore easy to misuse as an equality filter rather than a parent filter.
- Severity: P2.

### 4. Cross-variant casing drift inside `IEcommerceMallShopCategory`

- Base type carries `subCategories: ISummary[]` (camelCase).
- `ISummary` carries `sub_categories_count: number` (snake_case).
- Same semantic stem (`subCategories` / `sub_categories_count`) in two casings inside the same entity.
- Belongs to defect class #10 in `.ai/AUTOVIEW_AGAIN_INVARIANT_MAP.md` (snake/camel mix across variants).
- Severity: P2.

### 5. `IPage.IPagination.current` allows 0 despite docstring "1-indexed"

- Type: `current: number & tags.Type<"int32"> & tags.Minimum<0>`.
- Docstring: "Current page number being viewed (1-indexed). Page numbering starts from 1, so the first page is page 1 (not 0)."
- `Minimum<0>` should be `Minimum<1>` to make the docstring enforceable at the schema level.
- Severity: P2.

## UI Design Problems Caused by API Shape

### 6. `IEcommerceMallShopCategory.ISummary` lacks `created_at`

- Base type has both `created_at` and `updated_at`.
- `ISummary` only carries `updated_at`.
- List UIs that need to show when a category was originally created cannot get that field from the list endpoint; they must round-trip through `at` for every row, which defeats the purpose of an `ISummary`.
- Belongs to defect class #12 in `.ai/AUTOVIEW_AGAIN_INVARIANT_MAP.md` (ISummary completeness).
- Severity: P2.

## Flows That simulate:true Could Not Verify

(None recorded for the shop_categories journey — list + detail are pure read.)

## Flows That Need Real Backend Runtime

(None recorded for the shop_categories journey.)

## Cross-PoC Pattern Reproduction

| # | 4-PoC pattern | reproduced here? | evidence |
|---|---|---|---|
| 1 | `PATCH /resources` listing | yes | `shop_categories.index` is PATCH /ecommerceMall/shop-categories |
| 2 | typia transform inert | yes (environment-universal) | mock store bypass |
| 3 | enum-shaped value as free `string` | tbd | not yet exercised on this journey |
| 4 | actor-owned read endpoint missing | tbd | not yet exercised on this journey |
| 5 | pagination meta unverifiable | yes | mock store wraps pagination |
| 6 | `null \| null` reject/cancel reason | 0 occurrence(s) | see locations above |

## Cross-Model Comparison (optional)
<!-- Fill if comparing against another model on the same domain. -->
