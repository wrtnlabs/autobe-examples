import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate default wishlist flag behavior when creating multiple wishlists.
 *
 * Business goal: Ensure that when a customer creates multiple wishlists while
 * requesting `is_default=true` for more than one of them, the platform enforces
 * the invariant that at most one active wishlist is marked as default for that
 * customer.
 *
 * Scenario steps:
 *
 * 1. Join a new customer using POST /auth/customer/join to obtain an authenticated
 *    customer context.
 * 2. Create the first wishlist with `is_default=true` and `status="active"`.
 * 3. Create a second wishlist for the same customer, again requesting
 *    `is_default=true` and `status="active"`.
 * 4. List wishlists via PATCH /shoppingMall/customer/wishlists using
 *    IShoppingMallWishlist.IRequest, filtering by `status="active"` and
 *    deterministic pagination/sorting.
 * 5. From the returned IShoppingMallWishlist.ISummary records, filter wishlists
 *    owned by this customer and count how many active wishlists have
 *    `is_default=true`.
 * 6. Assert that there is at most one such default active wishlist and that there
 *    is at least one default among active wishlists, regardless of whether the
 *    platform demotes the first default or ignores the second.
 */
export async function test_api_customer_wishlist_creation_default_flag_behavior(
  connection: api.IConnection,
) {
  // 1. Join a new customer to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 2. Create first wishlist as default, active
  const firstWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const firstWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: firstWishlistBody,
    });
  typia.assert(firstWishlist);

  // 3. Create second wishlist also requesting default, active
  const secondWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const secondWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: secondWishlistBody,
    });
  typia.assert(secondWishlist);

  // 4. List active wishlists for this customer
  const indexBody = {
    page: 0,
    limit: 10,
    status: "active",
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallWishlist.IRequest;

  const pageResult = await api.functional.shoppingMall.customer.wishlists.index(
    connection,
    {
      body: indexBody,
    },
  );
  typia.assert(pageResult);

  const activeForCustomer = pageResult.data.filter((summary) => {
    return summary.status === "active" && summary.customer.id === customerId;
  });

  const defaultActiveWishlists = activeForCustomer.filter(
    (summary) => summary.is_default === true,
  );

  const defaultCount = defaultActiveWishlists.length;

  // 5. Assert business invariant: at most one default active wishlist
  TestValidator.predicate(
    "at most one active wishlist is marked as default for the customer",
    defaultCount <= 1,
  );

  // 6. Assert that at least one default exists among active wishlists,
  // given that we requested default for both creations.
  TestValidator.predicate(
    "at least one active wishlist remains default after multiple default creations",
    defaultCount >= 1,
  );

  // Optionally verify that both created wishlists are present in the
  // listed active wishlists for this customer (defensive sanity checks).
  const listedIds = activeForCustomer.map((s) => s.id);

  TestValidator.predicate(
    "first created wishlist appears in active wishlist listings",
    listedIds.includes(firstWishlist.id),
  );

  TestValidator.predicate(
    "second created wishlist appears in active wishlist listings",
    listedIds.includes(secondWishlist.id),
  );
}
