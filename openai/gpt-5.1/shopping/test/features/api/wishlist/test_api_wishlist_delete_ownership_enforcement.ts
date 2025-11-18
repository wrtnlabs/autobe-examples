import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Enforce wishlist deletion ownership between different customers.
 *
 * Business goal: Ensure that a customer cannot delete another customer's
 * wishlist using DELETE /shoppingMall/customer/wishlists/{wishlistId}. Only the
 * owning customer should be able to successfully delete their wishlist. When a
 * different authenticated customer attempts deletion, the API must reject the
 * request with an error and must not perform the deletion.
 *
 * Limitations and focus:
 *
 * - Available APIs: customer join, wishlist create, wishlist erase.
 * - There is no wishlist read/list endpoint in scope, nor a login endpoint, so we
 *   cannot:
 *
 *   - Re-authenticate as the original customer after switching,
 *   - Or re-fetch the wishlist by id to prove it still exists.
 * - Therefore, this test focuses on ownership enforcement at the erase call
 *   boundary: a non-owner must not be able to perform a successful erase
 *   operation.
 *
 * Test flow:
 *
 * 1. Register customer A via POST /auth/customer/join.
 *
 *    - Use IShoppingMallCustomerJoin.IRequest as body.
 *    - Assert the response as IShoppingMallCustomer.IAuthorized.
 * 2. As customer A (Authorization header set by join), create a wishlist via POST
 *    /shoppingMall/customer/wishlists.
 *
 *    - Use IShoppingMallWishlist.ICreate as body.
 *    - Assert the response as IShoppingMallWishlist and keep its id.
 *    - Optionally, verify that wishlist.customer.id matches the authenticated
 *         customer's id from step 1.
 * 3. Register customer B via POST /auth/customer/join on the same connection.
 *
 *    - This overwrites connection.headers.Authorization to B's token.
 *    - Assert the response as IShoppingMallCustomer.IAuthorized.
 * 4. As customer B, attempt to erase the wishlist created by customer A using
 *    api.functional.shoppingMall.customer.wishlists.erase.
 *
 *    - Wrap the call in TestValidator.error with an async closure to assert that it
 *         fails (throws an HttpError or equivalent).
 *    - Do not test for specific HTTP status codes.
 * 5. Because we lack wishlist read/list endpoints and login, we cannot re-verify
 *    persistence of the wishlist after the failed delete attempt. The key
 *    business rule validated here is that a different customer cannot
 *    successfully perform the erase operation for a wishlist they do not own.
 */
export async function test_api_wishlist_delete_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Register customer A (join) and assert authorized response
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. As customer A, create a wishlist and assert it belongs to A
  const wishlistCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: null,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // Basic ownership sanity check: wishlist.customer.id should equal customerA.id
  TestValidator.equals(
    "wishlist should be owned by customer A",
    wishlist.customer.id,
    customerA.id,
  );

  // 3. Register customer B (join) on the same connection
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

  // Ensure that customer B is indeed a different account
  TestValidator.notEquals(
    "customer A and B must be different accounts",
    customerA.id,
    customerB.id,
  );

  // 4. As customer B, attempt to erase A's wishlist and expect failure
  await TestValidator.error(
    "non-owner customer must not be able to delete another customer's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );
}
