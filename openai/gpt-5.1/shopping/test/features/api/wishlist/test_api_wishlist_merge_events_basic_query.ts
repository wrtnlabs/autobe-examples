import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistMergeEvent";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

/**
 * Validate basic pagination query of wishlist merge events for an authenticated
 * customer.
 *
 * Business context: A customer can have one or more wishlists. Behind the
 * scenes, when guest or secondary wishlists are merged into a primary customer
 * wishlist, the system records audit rows in
 * shopping_mall_wishlist_merge_events. The customer-scoped endpoint PATCH
 * /shoppingMall/customer/wishlists/{wishlistId}/mergeEvents exposes a paginated
 * view of those audit rows for a particular wishlist.
 *
 * This test focuses on the simplest, business-critical scenario: using basic
 * pagination (page + limit) without any additional filters to query merge
 * events for a freshly created wishlist belonging to the authenticated
 * customer. Because there is no public API to force-create merge events, the
 * test must be correct even if zero events are returned, while still validating
 * that the endpoint accepts the request shape and echoes pagination correctly.
 *
 * Steps:
 *
 * 1. Register a new customer using POST /auth/customer/join and obtain an
 *    authorized customer session via the SDK (token is applied to connection
 *    automatically).
 * 2. Create a new wishlist for that customer using POST
 *    /shoppingMall/customer/wishlists, capturing its id.
 * 3. Call PATCH /shoppingMall/customer/wishlists/{wishlistId}/mergeEvents with an
 *    IShoppingMallWishlistMergeEvent.IRequest body that sets page and limit,
 *    leaving all other filters as null / undefined (no filtering).
 * 4. Assert that the response is a valid
 *    IPageIShoppingMallWishlistMergeEvent.ISummary:
 *
 *    - Typia.assert on the response object for perfect type validation.
 *    - Pagination.current equals the requested page.
 *    - Pagination.limit equals the requested limit.
 * 5. If the data array is non-empty, perform lightweight business assertions that
 *    are safe without direct access to target wishlist id in the DTO:
 *
 *    - Ensure merged_item_count and dropped_item_count are non-negative for each
 *         event.
 *    - Do not attempt to validate target_wishlist_id because the summary DTO
 *         intentionally omits it; instead, rely on the contract that the
 *         endpoint is wishlist-scoped.
 */
export async function test_api_wishlist_merge_events_basic_query(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a wishlist for the authenticated customer
  const wishlistCreateBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
    status: "active", // non-null string to satisfy IShoppingMallWishlist.ICreate.status
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3. Query merge events with basic pagination only
  const requestedPage = 1 as number;
  const requestedLimit = 10 as number;

  const mergeRequestBody = {
    source_actor_type: null,
    target_actor_type: null,
    source_guestuser_id: null,
    target_customer_id: null,
    source_wishlist_id: null,
    target_wishlist_id: null,
    min_merged_item_count: null,
    max_merged_item_count: null,
    min_dropped_item_count: null,
    max_dropped_item_count: null,
    reason_query: null,
    created_from: null,
    created_to: null,
    page: requestedPage,
    limit: requestedLimit,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  const page: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: mergeRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(page);

  // 4. Assert pagination echoes the requested values
  TestValidator.equals(
    "pagination.current should match requested page",
    page.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination.limit should match requested limit",
    page.pagination.limit,
    requestedLimit,
  );

  // 5. If there are any merge events, verify merged/dropped counts are non-negative
  if (page.data.length > 0) {
    for (const event of page.data) {
      // Ensure merged_item_count is non-negative
      TestValidator.predicate(
        "merged_item_count must be non-negative",
        event.merged_item_count >= 0,
      );

      // Ensure dropped_item_count is non-negative
      TestValidator.predicate(
        "dropped_item_count must be non-negative",
        event.dropped_item_count >= 0,
      );
    }
  }
}
