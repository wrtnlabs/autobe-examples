import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Toggle default flag between customer wishlists and validate update response.
 *
 * Business goal:
 *
 * - Ensure that a customer can promote a non-default wishlist to default using
 *   the update endpoint, and that the update response reflects the requested
 *   change while preserving other fields.
 *
 * Available APIs:
 *
 * - POST /auth/customer/join -> api.functional.auth.customer.join
 *
 *   - Body: IShoppingMallCustomerJoin.IRequest
 *   - Response: IShoppingMallCustomer.IAuthorized
 * - POST /shoppingMall/customer/wishlists ->
 *   api.functional.shoppingMall.customer.wishlists.create
 *
 *   - Body: IShoppingMallWishlist.ICreate
 *   - Response: IShoppingMallWishlist
 * - PUT /shoppingMall/customer/wishlists/{wishlistId} ->
 *   api.functional.shoppingMall.customer.wishlists.update
 *
 *   - Params: wishlistId (uuid)
 *   - Body: IShoppingMallWishlist.IUpdate
 *   - Response: IShoppingMallWishlist
 *
 * Scenario implemented (bounded by available APIs):
 *
 * 1. Join a new customer; connection is automatically authorized via token.
 * 2. Create Wishlist A as default (is_default = true, status = "active").
 * 3. Create Wishlist B as non-default (is_default = false, status = "active").
 * 4. Update Wishlist B with IShoppingMallWishlist.IUpdate specifying only
 *    is_default = true, leaving other fields undefined so they are preserved
 *    server-side.
 * 5. Validate that update response:
 *
 *    - Has the same id as Wishlist B,
 *    - Is_default is true,
 *    - Status is still "active",
 *    - Customer.id equals the joined customer.id.
 *
 * We cannot re-fetch Wishlist A to check its demotion because no listing/
 * retrieval endpoint is provided; instead we focus on what can be asserted from
 * the available responses.
 */
export async function test_api_wishlist_update_toggle_default_flag(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Create Wishlist A as default
  const createBodyA = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBodyA,
    });
  typia.assert(wishlistA);

  TestValidator.equals(
    "wishlist A belongs to joined customer",
    wishlistA.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist A is default before update",
    wishlistA.is_default,
    true,
  );
  TestValidator.equals(
    "wishlist A is active before update",
    wishlistA.status,
    "active",
  );

  // 3. Create Wishlist B as non-default
  const createBodyB = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    is_default: false,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBodyB,
    });
  typia.assert(wishlistB);

  TestValidator.equals(
    "wishlist B belongs to joined customer",
    wishlistB.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist B is non-default before update",
    wishlistB.is_default,
    false,
  );
  TestValidator.equals(
    "wishlist B is active before update",
    wishlistB.status,
    "active",
  );

  // 4. Promote Wishlist B to default using update, changing only is_default
  const updateBodyB = {
    is_default: true,
  } satisfies IShoppingMallWishlist.IUpdate;

  const updatedWishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlistB.id,
      body: updateBodyB,
    });
  typia.assert(updatedWishlistB);

  // 5. Validate update response
  TestValidator.equals(
    "updated wishlist B id should match original wishlist B id",
    updatedWishlistB.id,
    wishlistB.id,
  );
  TestValidator.equals(
    "updated wishlist B belongs to the same customer",
    updatedWishlistB.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "updated wishlist B is now default",
    updatedWishlistB.is_default,
    true,
  );
  TestValidator.equals(
    "updated wishlist B remains active",
    updatedWishlistB.status,
    "active",
  );
}
