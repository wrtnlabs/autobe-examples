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

export async function test_api_wishlist_merge_events_access_control(
  connection: api.IConnection,
) {
  // 1. Register Customer A and obtain an authenticated customer context.
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; let the server derive it.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. Under Customer A, create a wishlist.
  const wishlistCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    // Mark this wishlist as default with an active status string.
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlistA);

  // 3. We cannot explicitly create merge events due to missing public APIs.
  //    The presence or absence of events is not important for this access-
  //    control test; we only need to ensure that other customers cannot query
  //    this wishlist's events.

  // 4. Register Customer B, which will switch the SDK connection to a
  //    different authenticated customer.
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  // 5. While authenticated as Customer B, attempt to query merge events for
  //    wishlistA (which is owned by Customer A). This should fail due to
  //    authorization rules that restrict access to a customer's own wishlists.
  const mergeEventsRequestBody = {
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
    // Ask for the first page with a small limit; values are arbitrary but
    // valid and type-safe.
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  await TestValidator.error(
    "customer B must not access merge events of wishlist owned by customer A",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
        connection,
        {
          wishlistId: wishlistA.id,
          body: mergeEventsRequestBody,
        },
      );
    },
  );
}
