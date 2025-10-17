import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test customer's ability to reorganize and rename wishlists as shopping
 * priorities evolve.
 *
 * This test validates the complete workflow of wishlist reorganization:
 *
 * 1. Customer registers and authenticates
 * 2. Creates a wishlist with a generic name "General Wishlist"
 * 3. Updates the wishlist to a more specific name "Summer Wardrobe"
 * 4. Verifies that the update maintains wishlist integrity and functionality
 *
 * The test ensures customers can refine their wishlist organization as their
 * shopping plans evolve, validating that name updates preserve the wishlist ID
 * and maintain normal operation for subsequent interactions.
 */
export async function test_api_wishlist_reorganization_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account
  const customerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerRegistration,
    });
  typia.assert(customer);

  // Step 2: Create initial wishlist with generic name
  const initialWishlistData = {
    name: "General Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: initialWishlistData,
    });
  typia.assert(createdWishlist);

  // Verify initial wishlist creation
  TestValidator.equals(
    "initial wishlist name should match",
    createdWishlist.name,
    "General Wishlist",
  );

  // Step 3: Update wishlist to more specific name
  const updatedWishlistData = {
    name: "Summer Wardrobe",
  } satisfies IShoppingMallWishlist.IUpdate;

  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: createdWishlist.id,
      body: updatedWishlistData,
    });
  typia.assert(updatedWishlist);

  // Step 4: Validate update results
  TestValidator.equals(
    "wishlist ID should remain unchanged after rename",
    updatedWishlist.id,
    createdWishlist.id,
  );

  TestValidator.equals(
    "wishlist name should be updated to new value",
    updatedWishlist.name,
    "Summer Wardrobe",
  );

  TestValidator.notEquals(
    "wishlist name should differ from original",
    updatedWishlist.name,
    "General Wishlist",
  );
}
