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
 * Test wishlist privacy setting toggle scenario.
 *
 * Validates that customers can successfully toggle wishlist privacy settings
 * between private and public visibility. Tests the complete workflow from
 * customer authentication through multiple privacy setting changes.
 */
export async function test_api_customer_wishlist_update_privacy_toggle(
  connection: api.IConnection,
) {
  // Step 1: Customer authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial wishlist with private setting
  const initialWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_public: false,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(initialWishlist);
  TestValidator.equals(
    "initial wishlist should be private",
    initialWishlist.is_public,
    false,
  );

  // Step 3: Update wishlist to public visibility
  const publicWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: initialWishlist.id,
      body: {
        is_public: true,
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(publicWishlist);
  TestValidator.equals(
    "wishlist should be public after update",
    publicWishlist.is_public,
    true,
  );
  TestValidator.equals(
    "wishlist ID should remain unchanged",
    publicWishlist.id,
    initialWishlist.id,
  );
  TestValidator.equals(
    "wishlist name should remain unchanged",
    publicWishlist.name,
    initialWishlist.name,
  );

  // Step 4: Update wishlist back to private visibility
  const privateWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: publicWishlist.id,
      body: {
        is_public: false,
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(privateWishlist);
  TestValidator.equals(
    "wishlist should be private after second update",
    privateWishlist.is_public,
    false,
  );
  TestValidator.equals(
    "wishlist ID should remain unchanged",
    privateWishlist.id,
    initialWishlist.id,
  );
  TestValidator.equals(
    "wishlist name should remain unchanged",
    privateWishlist.name,
    initialWishlist.name,
  );
  TestValidator.equals(
    "wishlist description should remain unchanged",
    privateWishlist.description,
    initialWishlist.description,
  );

  // Step 5: Validate complete privacy toggle cycle
  TestValidator.notEquals(
    "public and private wishlist objects should differ",
    publicWishlist.is_public,
    privateWishlist.is_public,
  );
  TestValidator.predicate(
    "updated_at timestamp should change after updates",
    privateWishlist.updated_at !== initialWishlist.updated_at,
  );
}
