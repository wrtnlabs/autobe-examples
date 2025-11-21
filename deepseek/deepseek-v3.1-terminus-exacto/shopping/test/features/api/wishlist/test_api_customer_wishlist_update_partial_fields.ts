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
 * Test partial wishlist update with selective field modifications.
 *
 * Validates that the wishlist update API correctly handles partial updates
 * where only specific fields are modified while others remain unchanged. This
 * test creates a wishlist with initial values, then performs a partial update
 * modifying only the name and priority fields while leaving the description,
 * visibility settings, and status intact.
 */
export async function test_api_customer_wishlist_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Customer authentication - create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial wishlist with specific values
  const initialWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Initial Wishlist Name",
        description: "This is the original description",
        is_public: false,
        priority: 5,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(initialWishlist);

  // Step 3: Perform partial update - modify only name and priority
  const updatedWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: initialWishlist.id,
      body: {
        name: "Updated Wishlist Name",
        priority: 8,
        // Note: description, is_public, and status are intentionally omitted
        // to test that they remain unchanged
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(updatedWishlist);

  // Step 4: Validate partial update results

  // Modified fields should have new values
  TestValidator.equals(
    "name should be updated",
    updatedWishlist.name,
    "Updated Wishlist Name",
  );
  TestValidator.equals(
    "priority should be updated",
    updatedWishlist.priority,
    8,
  );

  // Unmodified fields should remain unchanged
  TestValidator.equals(
    "description should remain unchanged",
    updatedWishlist.description,
    "This is the original description",
  );
  TestValidator.equals(
    "is_public should remain unchanged",
    updatedWishlist.is_public,
    false,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedWishlist.status,
    "active",
  );

  // System-generated fields should be properly maintained
  TestValidator.equals(
    "wishlist ID should remain the same",
    updatedWishlist.id,
    initialWishlist.id,
  );
  TestValidator.equals(
    "customer ID should remain the same",
    updatedWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "created_at timestamp should be preserved",
    updatedWishlist.created_at,
    initialWishlist.created_at,
  );

  // updated_at should be refreshed (different from original)
  await TestValidator.predicate(
    "updated_at timestamp should be refreshed",
    updatedWishlist.updated_at !== initialWishlist.updated_at,
  );

  // Additional validation: Customer relationship integrity
  TestValidator.equals(
    "customer email should match",
    updatedWishlist.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer first name should match",
    updatedWishlist.customer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "customer last name should match",
    updatedWishlist.customer.last_name,
    customer.last_name,
  );
}
