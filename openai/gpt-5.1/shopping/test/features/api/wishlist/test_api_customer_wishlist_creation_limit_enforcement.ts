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
 * Validate enforcement of per-customer wishlist creation limit.
 *
 * Business context
 *
 * - Customers can create wishlists for organizing products of interest.
 * - Platform policies may limit how many wishlists a single customer can own.
 * - This test ensures the wishlist creation endpoint enforces that limit and that
 *   the listing endpoint never shows more wishlists than allowed.
 *
 * Scenario
 *
 * 1. Register a new shopping mall customer using /auth/customer/join.
 *
 *    - Use a random but valid email, password, and URI fields.
 *    - Rely on SDK to attach the JWT token into the connection headers.
 * 2. Define an assumed business limit of N wishlists per customer (choose a small
 *    fixed constant like 3 for the test) to model "up to the limit" and "beyond
 *    the limit" behavior.
 * 3. Call POST /shoppingMall/customer/wishlists exactly N times with distinct but
 *    valid IShoppingMallWishlist.ICreate payloads.
 *
 *    - Use different names (e.g., "Wishlist #1", "Wishlist #2", ...).
 *    - Provide a mix of description present/null and is_default true/false.
 *    - Always use a valid, non-null status string, such as "active".
 *    - Assert each response is a valid IShoppingMallWishlist using typia.assert.
 * 4. After the N successful creations, attempt a (N+1)-th wishlist creation call
 *    with another valid payload.
 *
 *    - Expect this call to fail due to business rule enforcement (limit exceeded),
 *         using TestValidator.error to assert an error is thrown.
 *    - Do NOT try to assert exact HTTP status codes; only check that an error
 *         occurs.
 * 5. Call PATCH /shoppingMall/customer/wishlists with an
 *    IShoppingMallWishlist.IRequest body to list the customer's wishlists.
 *
 *    - Use page=0, limit large enough (e.g., 20) to cover all created lists.
 *    - Filter by status "active" and some default ordering (e.g., by "created_at"
 *         ascending).
 *    - Assert the response is a valid IPageIShoppingMallWishlist.ISummary with
 *         typia.assert.
 *    - Use TestValidator.predicate to verify that the total number of wishlists in
 *         `data` is less than or equal to the assumed limit N and that all
 *         returned summaries belong to the same customer.
 * 6. Optionally, compare the IDs of successfully created wishlists against the
 *    listed data to ensure they are all present in the listing results.
 */
export async function test_api_customer_wishlist_creation_limit_enforcement(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) to obtain an authenticated customer context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Define assumed wishlist limit per customer
  const WISHLIST_LIMIT = 3;

  const createdWishlists: IShoppingMallWishlist[] = [];

  // 3. Create wishlists up to the limit
  for (let i = 0; i < WISHLIST_LIMIT; i += 1) {
    const createBody = {
      name: `Wishlist #${i + 1}`,
      description:
        i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 3 }) : null,
      is_default: i === 0,
      status: "active",
    } satisfies IShoppingMallWishlist.ICreate;

    const wishlist: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: createBody,
      });
    typia.assert(wishlist);

    createdWishlists.push(wishlist);
  }

  // 4. Attempt one more creation beyond the limit, expect failure
  const overflowCreateBody = {
    name: `Wishlist #${WISHLIST_LIMIT + 1}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: false,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  await TestValidator.error(
    "creating wishlist beyond limit must fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: overflowCreateBody,
      });
    },
  );

  // 5. List wishlists and validate limit enforcement in listing
  const listBody = {
    page: 0,
    limit: 20,
    search: undefined,
    status: "active",
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies IShoppingMallWishlist.IRequest;

  const page: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: listBody,
    });
  typia.assert(page);

  // Ensure the number of wishlists does not exceed the presumed limit
  TestValidator.predicate(
    "wishlist count must not exceed configured limit",
    page.data.length <= WISHLIST_LIMIT,
  );

  // Ensure all listed wishlists belong to the same customer
  TestValidator.predicate(
    "all wishlists belong to the joined customer",
    page.data.every((summary) => summary.customer.id === customer.id),
  );

  // 6. Ensure all successfully created wishlists are present in listing results
  const listedIds = page.data.map((summary) => summary.id);

  TestValidator.predicate(
    "all created wishlists are present in listing",
    createdWishlists.every((wishlist) => listedIds.includes(wishlist.id)),
  );
}
