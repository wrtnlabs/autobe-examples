# AutoView Agent Plan — shopping

Generated: 2026-05-14T06:02:31Z
Generator: scripts/autoview-again-agent (Phase 1+2 deterministic)
Source: /Users/yongrean/Downloads/autobe-examples/qwen/qwen3.6-flash/shopping/src/api/functional

## Prefix

- `ecommerceMall`

## Actors

- **admin** — auth ops: `join,login,refresh`
- **customer** — auth ops: `join,login,refresh`
- **seller** — auth ops: `join,login,refresh`

## Resource Inventory

Total: 82 resources

### Global resources

| Resource | Verbs |
|---|---|
| `categories` | `index,at` |
| `products` | `index,at` |
| `products/reviews` | `index,at` |
| `products/variants` | `at` |
| `sellers` | `index,at` |
| `sellers/profile` | `at` |
| `shop_categories` | `index,at` |

### Actor-owned: admin (25 resources)

| Resource | Verbs |
|---|---|
| `admins` | `index,at` |
| `bans` | `create,index,at,update,erase` |
| `bans/customer_mapping` | `at` |
| `bans/seller_mapping` | `at` |
| `cancellation_requests/snapshots` | `list` |
| `categories` | `create,update,erase` |
| `customers` | `index,at` |
| `inventory_records` | `create,index,at,update,erase` |
| `orders` | `index,at,update,erase,forceRefund` |
| `orders/force_cancel` | `forceCancel` |
| `orders/orderItems` | `at` |
| `orders/order_items` | `index` |
| `orders/order_items/snapshots` | `index,at` |
| `roleRequests` | `erase,index,decide` |
| `role_requests` | `create,index,at,update` |
| `sellers/approval_histories` | `create,index,at` |
| `sellers/approval_reviews` | `create,index,at,update` |
| `sellers/approvals` | `create,update,at` |
| `sellers/metrics` | `at` |
| `sellers/profile_snapshots` | `search,index,at` |
| `sellers/requests` | `index` |
| `shop_categories` | `create,update,erase` |
| `snapshots` | `index,at` |
| `userBans` | `index` |
| `users` | `ban,unban` |

### Actor-owned: customer (25 resources)

| Resource | Verbs |
|---|---|
| `addresses` | `create,index,at,update,erase` |
| `addresses/set_default` | `setDefault` |
| `cancellation_requests` | `index,at` |
| `cancellation_requests/snapshots` | `list` |
| `cart_items` | `create,index,erase,at,update,eraseByCartitemid` |
| `categories/tree` | `index` |
| `email_verifications` | `index,at` |
| `order_items/cancellation_requests` | `create` |
| `order_items/refund_requests` | `create` |
| `orders` | `create,index,at` |
| `orders/orderItems` | `at` |
| `orders/order_items` | `index` |
| `orders/order_items/snapshots` | `index,at` |
| `orders/shipments` | `index` |
| `orders/shipments/confirm_delivery` | `confirmDelivery` |
| `password_resets` | `index,at` |
| `products/reviews` | `create` |
| `products/search` | `index` |
| `products/variants/stock_status` | `index` |
| `profile` | `at,update` |
| `refund_requests` | `index,at` |
| `reviews` | `index,at,update,erase` |
| `sessions` | `index,at` |
| `wishlist_items` | `create,index,at,update,erase` |
| `wishlists` | `create,index,at,update,erase` |

### Actor-owned: seller (25 resources)

| Resource | Verbs |
|---|---|
| `account` | `erase` |
| `cancellation_requests` | `update` |
| `cancellation_requests/review` | `patch,patchByRequestid` |
| `cancellation_requests/snapshots` | `list` |
| `cancellation_requests/status` | `update` |
| `dashboard` | `at` |
| `inventory_records` | `create,index,at,update,erase` |
| `order_items` | `index` |
| `orders/items` | `index` |
| `orders/order_items` | `update` |
| `products` | `create,update,erase` |
| `products/images` | `create,index,at,update,erase` |
| `products/variants` | `create,index,update,erase` |
| `profile` | `create,update` |
| `refund_requests` | `update,review` |
| `refund_requests/_review` | `index` |
| `refund_requests/status` | `update` |
| `sellers/approval_histories` | `at` |
| `sellers/approval_reviews` | `at` |
| `sellers/approvals` | `at` |
| `sellers/profile_snapshots` | `search,index,at` |
| `shipments` | `create,index,at,update,erase` |
| `shipments/items` | `manage,at,update,erase` |
| `status` | `at` |
| `storefront` | `create` |

## Workflow Verbs Present

- **`ban`** — 1 occurrence(s):
  - `admin/users`
- **`unban`** — 1 occurrence(s):
  - `admin/users`

_Allowlist_: `approve reject cancel refund dismiss restore submit resolve assign ban unban subscribe vote snooze archive`

## Risk Signals

### Empty DTO (`= {};`) — H1 from Phase 0

Count: **3** occurrence(s)

- `IEcommerceMallShippingAddress`
- `IEcommerceMallWishlist`
- `IEcommerceMallWishlistItem`

### `null | null` field — generation degeneration

_(none)_

### Approval/moderation-shape resources

Count: **33** resource(s)

| Scope | Resource | Match |
|---|---|---|
| admin | `bans` | ban |
| admin | `bans/customer_mapping` | ban |
| admin | `bans/seller_mapping` | ban |
| admin | `cancellation_requests/snapshots` | request |
| admin | `orders/order_items/snapshots` | snapshot |
| admin | `role_requests` | request |
| admin | `sellers/approval_histories` | approval |
| admin | `sellers/approval_reviews` | approval |
| admin | `sellers/approvals` | approval |
| admin | `sellers/profile_snapshots` | snapshot |
| admin | `sellers/requests` | request |
| admin | `snapshots` | snapshot |
| admin | `users` | verb:ban |
| customer | `cancellation_requests` | request |
| customer | `cancellation_requests/snapshots` | request |
| customer | `order_items/cancellation_requests` | request |
| customer | `order_items/refund_requests` | request |
| customer | `orders/order_items/snapshots` | snapshot |
| customer | `products/reviews` | review |
| customer | `refund_requests` | request |
| customer | `reviews` | review |
| global | `products/reviews` | review |
| seller | `cancellation_requests` | request |
| seller | `cancellation_requests/review` | request |
| seller | `cancellation_requests/snapshots` | request |
| seller | `cancellation_requests/status` | request |
| seller | `refund_requests` | request |
| seller | `refund_requests/_review` | request |
| seller | `refund_requests/status` | request |
| seller | `sellers/approval_histories` | approval |
| seller | `sellers/approval_reviews` | approval |
| seller | `sellers/approvals` | approval |
| seller | `sellers/profile_snapshots` | snapshot |

### Cross-variant property-name drift (C2-a)

_(none)_

### Cross-variant schema-shape drift (C2-b)

_(none)_

### Cross-variant rename drift (C2-c)

_(none)_

### Long-FK form drift (C2-d)

_(none)_

### IRequest.sort grammar (C3)

_(none — every IRequest with a sort property uses the canonical array<oneOf<const "<field>.<asc|desc>">>)_

### Recognized format dropped on string property

Count: **5** property(ies)

| Schema | Property | Expected format |
|---|---|---|
| `IEcommerceMallGuestSession.IRequest` | `search_href` | `uri` |
| `IEcommerceMallGuestSession.IRequest` | `search_referrer` | `uri` |
| `IEcommerceMallProductImage` | `url` | `uri` |
| `IEcommerceMallProductImage.ISummary` | `url` | `uri` |
| `IEcommerceMallProductImage.IUpdate` | `url` | `uri` |

### IRefresh field-name cross-entity drift

_(none — IRefresh schemas use a single platform-standard token field)_

### Variants outside the canonical list

Count: **30** entity-variant pair(s) outside the canonical list. These are not covered by Cross-Variant Property Naming Consistency (`prompts/INTERFACE_SCHEMA.md` §2.4) — review whether they should be folded into a canonical variant.

| Entity | Variant |
|---|---|
| `IEcommerceMallAddress` | `.ISetDefault` |
| `IEcommerceMallAdmin` | `.IAdminSummary` |
| `IEcommerceMallAdmin` | `.IFull` |
| `IEcommerceMallCancellationRequest` | `.IApprove` |
| `IEcommerceMallCancellationRequest` | `.IReject` |
| `IEcommerceMallCancellationRequest` | `.IRespond` |
| `IEcommerceMallCategory` | `.ITree` |
| `IEcommerceMallCheckout` | `.IAcknowledge` |
| `IEcommerceMallCheckout` | `.IReview` |
| `IEcommerceMallCustomer` | `.IAdminRequest` |
| `IEcommerceMallCustomer` | `.IAdminSummary` |
| `IEcommerceMallCustomer` | `.IDashboard` |
| `IEcommerceMallCustomer` | `.IReviewLineItem` |
| `IEcommerceMallCustomer` | `.IReviewRequest` |
| `IEcommerceMallCustomer` | `.IReviewResponse` |
| `IEcommerceMallOrder` | `.IForceCancel` |
| `IEcommerceMallOrder` | `.IForceCancelRequest` |
| `IEcommerceMallOrder` | `.IForceRefund` |
| `IEcommerceMallOrder` | `.IForceRefundRequest` |
| `IEcommerceMallProduct` | `.IDetail` |
| `IEcommerceMallProductImage` | `.IReorder` |
| `IEcommerceMallRefundRequest` | `.IApprove` |
| `IEcommerceMallRefundRequest` | `.IReject` |
| `IEcommerceMallRefundRequest` | `.IRespond` |
| `IEcommerceMallSeller` | `.IDashboard` |
| `IEcommerceMallSeller` | `.IOrderItemDashboardRequest` |
| `IEcommerceMallSnapshot` | `.IReconstruct` |
| `IPage` | `.IPagination` |
| `IPageIEcommerceMallCategory` | `.ITree` |
| `IPageIEcommerceMallCustomer` | `.IAdminSummary` |

### Actor-owned coverage

| Actor | Owned resources | Has 'my X'-style index? |
|---|---:|---|
| admin | 25 | yes |
| customer | 25 | yes |
| seller | 25 | yes |

## Recommended Journeys

Count: **8** (target 4-8 per Sidecar Agent Design §5)

| # | Priority | Route | Scope | Source verbs | Reason |
|---|---:|---|---|---|---|
| 1 | P0 | `auth/customer` | customer | `join,login,refresh` | Auth entry: primary actor exposes join/login/refresh |
| 2 | P1 | `categories` | guest-or-primary-actor | `index,at` | Happy path: browsable + detail-viewable global resource (2 ops) |
| 3 | P3 | `wishlists` | customer | `create,index,at,update,erase` | Empty DTO touches this resource: IEcommerceMallWishlist |
| 4 | P3.5 | `cancellation_requests` | customer | `index,at` | Commerce lifecycle: cart/wishlist/cancellation/refund/order |
| 5 | P4 | `bans` | admin | `create,index,at,update,erase` | Approval/queue: matched=ban |
| 6 | P5 | `addresses` | customer | `create,index,at,update,erase` | Actor-owned 'my X' for customer |
| 7 | P5 | `admins` | admin | `index,at` | Actor-owned 'my X' for admin |
| 8 | P5 | `inventory_records` | seller | `create,index,at,update,erase` | Actor-owned 'my X' for seller |

### Decision rules applied (Sidecar Agent Design §5)

- P0: auth entry — primary actor with join/login/refresh
- P1: happy path — global resource with most ops + index/at coverage
- P2: null|null reject/cancel flow (only if Phase 0 found null|null)
- P3: actor self-profile, then empty {} touched (only if Phase 0 found empty DTOs)
- P3.5: commerce lifecycle (cart / wishlist / cancellation / refund / order; cross-vendor reproduced on shopping; sits between P3 and P4 so it competes for a slot before P5/P7 fillers)
- P4: approval/queue (only if workflow verbs present)
- P5: actor-owned 'my X' (max 3 actors)
- P7: audit/log read
- Cap: 8 journeys (stress-test mode caps at 6 — apply manually if relevant)

## Next steps

1. Review the recommended journeys above. Override manually if needed before Phase 4.
2. Phase 4 (mock store): write `lib/sdk/mock/store.ts` with deterministic seed for the picked resources.
3. Phase 5 (adapters): write `lib/sdk/{entity}.ts` for each picked resource. Document any SDK quirks discovered (especially against the risk signals above) in adapter file headers AND in `docs/api-issues.md`.
4. Phase 6-8: pages / Playwright / final docs synthesis.

_This plan is generated deterministically and should be regenerated after any change to `src/api/`._
