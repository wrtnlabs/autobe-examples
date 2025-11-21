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
 * Test wishlist name uniqueness validation within customer account.
 *
 * Validates that the shopping mall platform enforces unique wishlist names per
 * customer. This test creates a customer account, establishes an initial
 * wishlist with a specific name, then attempts to create duplicate wishlists to
 * verify proper error handling while allowing reasonable naming variations.
 */
export async function test_api_wishlist_creation_name_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial wishlist with specific name
  const wishlistName = "My Favorite Products";
  const initialWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
        description: "My initial wishlist for testing",
        is_public: false,
        priority: 5,
        status: "active" as const,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(initialWishlist);
  TestValidator.equals(
    "initial wishlist name matches",
    initialWishlist.name,
    wishlistName,
  );

  // Step 3: Attempt to create duplicate wishlist with same name (should fail)
  await TestValidator.error("duplicate wishlist name should fail", async () => {
    return await api.functional.shoppingMall.customer.wishlists.create(
      connection,
      {
        body: {
          name: wishlistName, // Same name as existing wishlist
          description: "Duplicate wishlist attempt",
          is_public: true,
          priority: 3,
          status: "active" as const,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  });

  // Step 4: Create wishlist with similar but distinct name (should succeed)
  const similarWishlistName = "My Favorite Products 2";
  const similarWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: similarWishlistName,
        description: "Similar but distinct wishlist name",
        is_public: false,
        priority: 4,
        status: "active" as const,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(similarWishlist);
  TestValidator.equals(
    "similar wishlist name should be different",
    similarWishlist.name,
    similarWishlistName,
  );
  TestValidator.notEquals(
    "similar wishlist should have different ID",
    similarWishlist.id,
    initialWishlist.id,
  );

  // Step 5: Create wishlist with completely different name (should succeed)
  const differentWishlistName = "Future Purchases";
  const differentWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: differentWishlistName,
        description: "Completely different wishlist name",
        is_public: true,
        priority: 2,
        status: "active" as const,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(differentWishlist);
  TestValidator.equals(
    "different wishlist name should be accepted",
    differentWishlist.name,
    differentWishlistName,
  );

  // Step 6: Verify all wishlists belong to the same customer
  TestValidator.equals(
    "all wishlists belong to same customer",
    initialWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "similar wishlist belongs to same customer",
    similarWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "different wishlist belongs to same customer",
    differentWishlist.customer.id,
    customer.id,
  );
}
