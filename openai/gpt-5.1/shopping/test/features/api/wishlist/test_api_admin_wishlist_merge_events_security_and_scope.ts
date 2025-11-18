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
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

/**
 * Validate security boundaries and system-wide scope of admin wishlist merge
 * events analytics.
 *
 * Business goals:
 *
 * - Customer-scoped wishlist merge history is only accessible to the owning
 *   customer via the customer mergeEvents endpoints.
 * - Admin wishlist merge analytics endpoint is protected so that only admins can
 *   access it, and it aggregates merge events across the platform (potentially
 *   including multiple customers and guest users).
 * - Non-admin actors (customers, sellers, unauthenticated clients) must not be
 *   able to access the admin analytics endpoint.
 *
 * Scenario (adapted to available APIs and keeping focus on security and scope
 * rather than forcing concrete merge generation flows):
 *
 * 1. Create two customers A and B via /auth/customer/join. For each customer:
 *
 *    - Create a wishlist via /shoppingMall/customer/wishlists.
 *    - Add at least one wishlist item via
 *         /shoppingMall/customer/wishlists/{wishlistId}/items.
 *    - Query customer-scoped wishlist merge events via PATCH
 *         /shoppingMall/customer/wishlists/{wishlistId}/mergeEvents with a
 *         broad filter to capture any existing events.
 * 2. Register an admin via /auth/admin/join so that the connection becomes
 *    authenticated as an admin.
 *
 *    - Call admin analytics endpoint PATCH /shoppingMall/admin/wishlists/mergeEvents
 *         with a broad filter.
 *    - If customer-scoped calls returned any events, verify that the admin-wide list
 *         contains at least one event whose id matches any of those
 *         customer-visible events, demonstrating system-wide visibility.
 * 3. Authorization boundary checks for admin endpoint:
 *
 *    - As a seller actor (after /auth/seller/join, connection carries a seller
 *         token), calling the admin mergeEvents endpoint must fail.
 *    - As a customer actor (after /auth/customer/join for another customer), calling
 *         the admin mergeEvents endpoint must fail.
 *    - As an unauthenticated client (connection clone without headers), calling the
 *         admin mergeEvents endpoint must fail.
 *
 * The test validates type correctness via typia.assert on all responses and
 * business rules via TestValidator predicates and error assertions.
 */
export async function test_api_admin_wishlist_merge_events_security_and_scope(
  connection: api.IConnection,
) {
  // Helper to build a random but valid URL for href/referrer
  const randomUrl = (): string =>
    `https://example.com/${RandomGenerator.alphabets(8)}`;

  // 1. Create two customers A and B and their wishlists/items, then
  //    query customer-scoped merge events for each.

  // --- Customer A setup ---
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl() as string & tags.Format<"uri">,
    referrer: randomUrl() as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerA);

  const wishlistACreateBody = {
    name: "Customer A Wishlist",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistACreateBody,
    });
  typia.assert(wishlistA);

  const wishlistAItemBody = {
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_sku_id: null,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistAItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistA.id,
        body: wishlistAItemBody,
      },
    );
  typia.assert(wishlistAItem);

  const customerAMergeFilter = {
    source_actor_type: null,
    target_actor_type: null,
    source_guestuser_id: null,
    target_customer_id: null,
    source_wishlist_id: null,
    target_wishlist_id: wishlistA.id,
    min_merged_item_count: null,
    max_merged_item_count: null,
    min_dropped_item_count: null,
    max_dropped_item_count: null,
    reason_query: null,
    created_from: null,
    created_to: null,
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  const customerAEventsPage: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
      connection,
      {
        wishlistId: wishlistA.id,
        body: customerAMergeFilter,
      },
    );
  typia.assert(customerAEventsPage);

  const customerAEventIds = customerAEventsPage.data.map((e) => e.id);

  // --- Customer B setup ---
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl() as string & tags.Format<"uri">,
    referrer: randomUrl() as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerB);

  const wishlistBCreateBody = {
    name: "Customer B Wishlist",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBCreateBody,
    });
  typia.assert(wishlistB);

  const wishlistBItemBody = {
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_sku_id: null,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistBItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistB.id,
        body: wishlistBItemBody,
      },
    );
  typia.assert(wishlistBItem);

  const customerBMergeFilter = {
    source_actor_type: null,
    target_actor_type: null,
    source_guestuser_id: null,
    target_customer_id: null,
    source_wishlist_id: null,
    target_wishlist_id: wishlistB.id,
    min_merged_item_count: null,
    max_merged_item_count: null,
    min_dropped_item_count: null,
    max_dropped_item_count: null,
    reason_query: null,
    created_from: null,
    created_to: null,
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  const customerBEventsPage: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.index(
      connection,
      {
        wishlistId: wishlistB.id,
        body: customerBMergeFilter,
      },
    );
  typia.assert(customerBEventsPage);

  const customerBEventIds = customerBEventsPage.data.map((e) => e.id);

  // Sanity: customer-scoped responses are paginated correctly.
  TestValidator.predicate(
    "customer A merge events pagination limit non-negative",
    customerAEventsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "customer B merge events pagination limit non-negative",
    customerBEventsPage.pagination.limit >= 0,
  );

  // 2. Register an admin and query admin-wide wishlist merge events.

  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl() as string & tags.Format<"uri">,
    referrer: randomUrl() as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminMergeFilter = {
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
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallWishlistMergeEvent.IRequest;

  const adminEventsPage: IPageIShoppingMallWishlistMergeEvent.ISummary =
    await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
      connection,
      {
        body: adminMergeFilter,
      },
    );
  typia.assert(adminEventsPage);

  TestValidator.predicate(
    "admin merge events pagination limit non-negative",
    adminEventsPage.pagination.limit >= 0,
  );

  const adminEventIds = adminEventsPage.data.map((e) => e.id);

  const customerEventIds = [...customerAEventIds, ...customerBEventIds];
  if (customerEventIds.length > 0) {
    const overlapExists = customerEventIds.some((id) =>
      adminEventIds.includes(id),
    );
    TestValidator.predicate(
      "admin merge events should include at least one customer-visible event when such events exist",
      overlapExists,
    );
  }

  // 3. Authorization boundary checks for admin endpoint.

  // 3-1. Seller actor must not access admin merge events.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl() as string & tags.Format<"uri">,
    referrer: randomUrl() as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  await TestValidator.error(
    "seller actor must not be able to access admin wishlist merge events",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
        connection,
        {
          body: adminMergeFilter,
        },
      );
    },
  );

  // 3-2. Customer actor must not access admin merge events.
  const customerCJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: randomUrl() as string & tags.Format<"uri">,
    referrer: randomUrl() as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerC: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCJoinBody,
    });
  typia.assert(customerC);

  await TestValidator.error(
    "customer actor must not be able to access admin wishlist merge events",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
        connection,
        {
          body: adminMergeFilter,
        },
      );
    },
  );

  // 3-3. Unauthenticated client must not access admin merge events.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client must not be able to access admin wishlist merge events",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.mergeEvents.index(
        unauthConnection,
        {
          body: adminMergeFilter,
        },
      );
    },
  );
}
