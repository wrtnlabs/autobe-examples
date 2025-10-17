import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test complete wishlist update workflow where customers modify their wishlist
 * name.
 *
 * This test validates that customers can successfully update their wishlist
 * names to better organize saved products. The test ensures proper ownership
 * validation, where only the wishlist owner can modify their wishlist
 * properties.
 *
 * Test Flow:
 *
 * 1. Register a new customer account
 * 2. Create an initial wishlist with an original name
 * 3. Update the wishlist name to a new value
 * 4. Validate the update was successful
 * 5. Verify the wishlist ID remains unchanged
 * 6. Confirm the new name is properly reflected
 */
export async function test_api_wishlist_name_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create an initial wishlist with an original name
  const originalWishlistName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: originalWishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(createdWishlist);

  // Validate initial wishlist creation
  TestValidator.equals(
    "created wishlist name matches input",
    createdWishlist.name,
    originalWishlistName,
  );

  // Step 3: Update the wishlist name to a new value
  const newWishlistName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: createdWishlist.id,
      body: {
        name: newWishlistName,
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(updatedWishlist);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "updated wishlist name matches new value",
    updatedWishlist.name,
    newWishlistName,
  );

  // Step 5: Verify the wishlist ID remains unchanged
  TestValidator.equals(
    "wishlist ID unchanged after update",
    updatedWishlist.id,
    createdWishlist.id,
  );

  // Step 6: Confirm the new name is different from the original
  TestValidator.notEquals(
    "new name differs from original",
    updatedWishlist.name,
    originalWishlistName,
  );
}
