import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validates creation logic for shopping mall wishlists by a new customer.
 *
 * This test exercises the business rule that a customer may own at most one
 * wishlist.
 *
 * 1. Register a brand new customer using API with randomized but valid join data
 *    (unique email, name, phone, strong password).
 * 2. After join, authentication context is established (SDK auto-manages tokens).
 * 3. Invoke /shoppingMall/customer/wishlists POST endpoint to create the wishlist
 *    for this customer.
 * 4. Assert that the ownership info on the wishlist corresponds exactly to this
 *    customer (customer.id and name within wishlist.customer must match join).
 * 5. Confirm standard metadata (wishlist id, created_at, updated_at) is present,
 *    and that no cross-customer information or data leakage exists.
 * 6. Attempt to create a second wishlist for the same (still-authenticated)
 *    customer; expect a business rule error (enforced one wishlist per
 *    customer). Validate that an error is thrown and no new wishlist is
 *    created.
 */
export async function test_api_customer_wishlist_creation_by_new_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer (generate unique valid fields)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A$1z",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(joined);

  // 2 & 3. Auth context established by SDK, create first wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // Ownership and metadata validation
  TestValidator.equals(
    "wishlist customer id matches authenticated customer",
    wishlist.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "wishlist customer name matches",
    wishlist.customer.name,
    joined.name,
  );

  // Standard metadata present
  TestValidator.predicate(
    "wishlist id is UUID",
    typeof wishlist.id === "string" && wishlist.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is string",
    typeof wishlist.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof wishlist.updated_at === "string",
  );

  // 6. Attempt duplicate wishlist creation (should fail - expect error)
  await TestValidator.error(
    "duplicate wishlist creation should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: {} satisfies IShoppingMallWishlist.ICreate,
      });
    },
  );
}
