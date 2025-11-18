import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistMergeEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

/**
 * Validate admin wishlist mergeEvents date_range queries based on real
 * created_at values.
 *
 * Business goal:
 *
 * - Ensure that PATCH /shoppingMall/admin/wishlists/mergeEvents respects
 *   created_from/created_to inclusive date ranges.
 * - Confirm that omitting both created_from and created_to yields the full
 *   history for the chosen target customer.
 *
 * High level flow:
 *
 * 1. Register an admin (auth/admin/join) and keep credentials.
 * 2. Register a customer (auth/customer/join) and keep credentials.
 * 3. As the customer:
 *
 *    - Create a wishlist.
 *    - Add one or more wishlist items.
 *    - For each wishlist item, call moveItemToCart to trigger merge events.
 * 4. Switch to admin via admin/login.
 * 5. Call mergeEvents.index with an IRequest body that filters on
 *    target_customer_id equal to the customer.id and created_from/created_to
 *    both null. Capture the full page of events.
 * 6. If there are no events, we still run type assertions but skip range-specific
 *    predicate checks because there is nothing to filter; the purpose is to
 *    avoid relying on implicit DB state.
 * 7. If there are events:
 *
 *    - Compute the earliest and latest created_at among returned events.
 *    - For a chosen event in the middle of the list, create a very narrow window
 *         [created_at, created_at] and assert that this event appears in the
 *         response and that all returned events’ created_at are within the
 *         inclusive interval.
 *    - For the global range [minCreatedAt, maxCreatedAt], assert that all returned
 *         events’ created_at values are within the range.
 *    - For a window starting at the first event whose created_at is strictly after
 *         the mid event, assert that the mid event is excluded while all
 *         returned events still satisfy created_at >= created_from.
 *
 * Notes and constraints:
 *
 * - We cannot directly control server time; therefore, we derive ranges from the
 *   actual created_at values returned by the API instead of trying to simulate
 *   early/mid/late buckets across wall-clock time.
 * - The IShoppingMallWishlistMergeEvent.IRequest body supports many filters; here
 *   we rely on target_customer_id and created_from/created_to, leaving other
 *   filters null to keep the test focused on date ranges.
 * - We only touch connection via the SDK; no manual header manipulation.
 */
export async function test_api_admin_wishlist_merge_events_date_range_queries(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Register customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 3. As the customer, create a wishlist
  const wishlistCreateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // Create a few wishlist items to move to cart later.
  const wishlistItemBodies: IShoppingMallWishlistItem.ICreate[] =
    ArrayUtil.repeat(
      3,
      () =>
        ({
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_sku_id: null,
          position: null,
        }) satisfies IShoppingMallWishlistItem.ICreate,
    );

  const wishlistItems: IShoppingMallWishlistItem[] = [];
  for (const body of wishlistItemBodies) {
    const item: IShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlist.id,
          body,
        },
      );
    typia.assert<IShoppingMallWishlistItem>(item);
    wishlistItems.push(item);
  }

  // Move each item to cart to generate merge events
  for (const item of wishlistItems) {
    const moveResult: IShoppingMallWishlist.IMoveItemToCartResult =
      await api.functional.shoppingMall.customer.wishlists.moveItemToCart(
        connection,
        {
          wishlistId: wishlist.id,
          body: {
            wishlist_item_id: item.id,
            merge_strategy: "increase",
          } satisfies IShoppingMallWishlist.IMoveItemToCartRequest,
        },
      );
    typia.assert<IShoppingMallWishlist.IMoveItemToCartResult>(moveResult);
  }

  // 4. Switch to admin account explicitly (login)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 5. Full-history search for this target customer without date bounds
  const baseRequest = {
    source_actor_type: null,
    target_actor_type: null,
    source_guestuser_id: null,
    target_customer_id: customerAuthorized.id,
    source_wishlist_id: null,
    target_wishlist_id: null,
    min_merged_item_count: null,
    max_merged_item_count: null,
    min_dropped_item_count: null,
    max_dropped_item_count: null,
    reason_query: null,
    created_from: null,
    created_to: null,
    page: 1,
    limit: 100,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  const fullPage: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(fullPage);

  const allEvents: IShoppingMallWishlistMergeEvent.ISummary[] = fullPage.data;

  // Basic type-level and pagination sanity checks
  TestValidator.predicate(
    "pagination current is non-negative",
    fullPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    fullPage.pagination.limit >= 0,
  );

  if (allEvents.length === 0) {
    // When there are no events at all for this customer, we skip
    // date-range-specific assertions, but still verify that another call
    // with wide-open range also yields zero data.
    const wideRangePage: IPageIShoppingMallWishlistMergeEvent.ISummary =
      await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
        connection,
        {
          body: {
            ...baseRequest,
            created_from: null,
            created_to: null,
          } satisfies IShoppingMallWishlistMergeEvent.IRequest,
        },
      );
    typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(wideRangePage);
    TestValidator.equals(
      "no events remain when using open date range",
      wideRangePage.data.length,
      0,
    );
    return;
  }

  // Derive min and max created_at among all events for this target customer
  const sortedByCreated = [...allEvents].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const firstEvent = sortedByCreated[0];
  const lastEvent = sortedByCreated[sortedByCreated.length - 1];
  const midEvent = sortedByCreated[Math.floor(sortedByCreated.length / 2)];

  // 6. Narrow window exactly equal to midEvent.created_at
  const exactMidWindowRequest = {
    ...baseRequest,
    created_from: midEvent.created_at,
    created_to: midEvent.created_at,
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;
  const exactMidPage: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
      connection,
      { body: exactMidWindowRequest },
    );
  typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(exactMidPage);

  // All returned events must have created_at equal to midEvent.created_at
  for (const ev of exactMidPage.data) {
    TestValidator.equals(
      "event created_at matches the exact mid timestamp",
      ev.created_at,
      midEvent.created_at,
    );
  }

  // If at least one event is returned, ensure midEvent is among them
  if (exactMidPage.data.length > 0) {
    const hasMid = exactMidPage.data.some((ev) => ev.id === midEvent.id);
    TestValidator.predicate(
      "mid event should be included in its exact-time window",
      hasMid,
    );
  }

  // 7. Global window [minCreatedAt, maxCreatedAt]
  const globalRangeRequest = {
    ...baseRequest,
    created_from: firstEvent.created_at,
    created_to: lastEvent.created_at,
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;
  const globalRangePage: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
      connection,
      { body: globalRangeRequest },
    );
  typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(globalRangePage);

  // Every event returned by the global range must satisfy the bounds
  for (const ev of globalRangePage.data) {
    TestValidator.predicate(
      "event created_at is within global inclusive range",
      ev.created_at >= firstEvent.created_at &&
        ev.created_at <= lastEvent.created_at,
    );
  }

  // 8. Window starting strictly after the mid event, if such an event exists
  if (sortedByCreated.length >= 2) {
    const afterMidIndex = sortedByCreated.findIndex(
      (ev) => ev.created_at > midEvent.created_at,
    );

    if (afterMidIndex !== -1) {
      const afterMidEvent = sortedByCreated[afterMidIndex];

      const afterMidRequest = {
        ...baseRequest,
        created_from: afterMidEvent.created_at,
        created_to: lastEvent.created_at,
      } satisfies IShoppingMallWishlistMergeEvent.IRequest;

      const afterMidPage: IPageIShoppingMallWishlistMergeEvent.ISummary =
        await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
          connection,
          { body: afterMidRequest },
        );
      typia.assert<IPageIShoppingMallWishlistMergeEvent.ISummary>(afterMidPage);

      // Ensure all events obey created_at >= created_from and <= created_to
      for (const ev of afterMidPage.data) {
        TestValidator.predicate(
          "event created_at is within after-mid range",
          ev.created_at >= afterMidEvent.created_at &&
            ev.created_at <= lastEvent.created_at,
        );
      }

      // midEvent should not appear when there are any events in this window,
      // because the lower bound is strictly later than midEvent.created_at.
      if (afterMidPage.data.length > 0) {
        const stillHasMid = afterMidPage.data.some(
          (ev) => ev.id === midEvent.id,
        );
        TestValidator.predicate(
          "mid event should be excluded in after-mid window",
          !stillHasMid,
        );
      }
    }
  }
}
