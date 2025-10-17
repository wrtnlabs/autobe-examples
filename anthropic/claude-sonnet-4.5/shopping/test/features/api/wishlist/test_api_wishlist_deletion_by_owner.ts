import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test wishlist deletion workflow with owner authorization.
 *
 * This test validates that an authenticated customer can successfully delete
 * their own wishlist through soft deletion (setting deleted_at timestamp). It
 * verifies that:
 *
 * 1. The wishlist can be deleted successfully by its owner
 * 2. Wishlist names become available for reuse after deletion
 * 3. A new wishlist can be created with the same name as a deleted wishlist
 *
 * Test workflow:
 *
 * 1. Create customer account and authenticate
 * 2. Create a wishlist with specific name
 * 3. Delete the wishlist
 * 4. Verify name reusability by creating new wishlist with same name
 * 5. Verify new wishlist has different ID but same name
 */
export async function test_api_wishlist_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create a wishlist with specific name
  const wishlistName = RandomGenerator.name(2);
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: wishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // Verify the wishlist was created with correct name
  TestValidator.equals("wishlist name matches", wishlist.name, wishlistName);

  // Step 3: Delete the wishlist
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // Step 4: Verify name reusability - create new wishlist with same name
  const newWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(newWishlist);

  // Step 5: Verify new wishlist has different ID but same name
  TestValidator.notEquals(
    "new wishlist has different ID",
    newWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "new wishlist reuses name",
    newWishlist.name,
    wishlistName,
  );
}
