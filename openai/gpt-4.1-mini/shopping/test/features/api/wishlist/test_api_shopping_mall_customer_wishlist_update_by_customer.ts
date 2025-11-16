import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * This E2E test covers the update of a customer wishlist by an authenticated
 * customer.
 *
 * The test performs the following:
 *
 * 1. Registers a new customer account through the /auth/customer/join endpoint.
 * 2. Creates a new wishlist for this customer using the
 *    /shoppingMall/customer/wishlists POST endpoint.
 * 3. Updates the created wishlist's name using the
 *    /shoppingMall/customer/wishlists/{wishlistId} PUT endpoint.
 * 4. Validates that the updated wishlist reflects the new name while retaining the
 *    same ownership.
 *
 * This ensures that the wishlist update API operates correctly when performed
 * by the owning customer.
 */
export async function test_api_shopping_mall_customer_wishlist_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer to obtain authorization and user context
  const customerBody = {
    email: `customer_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: `Passw0rd!${RandomGenerator.alphaNumeric(4)}`,
    full_name: RandomGenerator.name(2),
    ip: null,
    href: `https://example.com/signup`,
    referrer: `https://google.com`,
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  // 2. Create a new wishlist with initial name
  const initialWishlistName = `My Wishlist ${RandomGenerator.alphaNumeric(4)}`;
  const createWishlistBody = {
    name: initialWishlistName,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert(wishlist);

  TestValidator.equals(
    "wishlist ownership matches customer id",
    wishlist.customer_id,
    customer.id,
  );

  TestValidator.equals(
    "wishlist name matches initial creation",
    wishlist.name,
    initialWishlistName,
  );

  // 3. Update the wishlist's name
  const updatedWishlistName = `Updated Wishlist ${RandomGenerator.alphaNumeric(4)}`;
  const updateWishlistBody = {
    name: updatedWishlistName,
  } satisfies IShoppingMallWishlist.IUpdate;

  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlist.id,
      body: updateWishlistBody,
    });
  typia.assert(updatedWishlist);

  // 4. Validate that the wishlist name was updated correctly and ownership persists
  TestValidator.equals(
    "wishlist id is preserved after update",
    updatedWishlist.id,
    wishlist.id,
  );

  TestValidator.equals(
    "wishlist ownership remains the same after update",
    updatedWishlist.customer_id,
    wishlist.customer_id,
  );

  TestValidator.equals(
    "wishlist name updated correctly",
    updatedWishlist.name,
    updatedWishlistName,
  );

  // Updated timestamp should be greater than or equal to created timestamp
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(updatedWishlist.updated_at) >= new Date(wishlist.created_at),
  );
}
