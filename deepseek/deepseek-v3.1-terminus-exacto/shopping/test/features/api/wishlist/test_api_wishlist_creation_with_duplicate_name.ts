import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test wishlist creation validation when attempting to create a wishlist with a
 * name that already exists for the same customer. Validates that the system
 * properly enforces unique wishlist names within a customer's account and
 * returns appropriate error responses when duplicate names are detected.
 */
export async function test_api_wishlist_creation_with_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for duplicate name testing
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial wishlist with specific name for duplicate testing
  const wishlistName = "My Favorite Products";
  const initialWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
        description: "A collection of my favorite products",
        is_public: false,
        priority: 5,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(initialWishlist);
  TestValidator.equals(
    "initial wishlist name matches",
    initialWishlist.name,
    wishlistName,
  );

  // Step 3: Attempt to create duplicate wishlist with same name
  await TestValidator.error("duplicate wishlist name should fail", async () => {
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName, // Same name as existing wishlist
        description: "Another wishlist with the same name",
        is_public: true,
        priority: 3,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  });

  // Step 4: Verify successful wishlist creation with different name
  const uniqueWishlistName = "My Shopping List";
  const uniqueWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: uniqueWishlistName,
        description: "A different wishlist with unique name",
        is_public: false,
        priority: 7,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(uniqueWishlist);
  TestValidator.equals(
    "unique wishlist name matches",
    uniqueWishlist.name,
    uniqueWishlistName,
  );
  TestValidator.notEquals(
    "unique wishlist ID differs from initial",
    uniqueWishlist.id,
    initialWishlist.id,
  );
}
