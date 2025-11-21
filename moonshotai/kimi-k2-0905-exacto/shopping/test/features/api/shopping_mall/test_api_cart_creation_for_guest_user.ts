import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation for anonymous guest users.
 *
 * This test validates that guests can successfully initialize shopping sessions
 * without authentication, establishing temporary cart contexts for product
 * browsing and selection. The test verifies cart initialization with proper
 * default values, unique identifier generation, and session management for
 * multi-seller marketplace operations.
 *
 * Key validation points:
 *
 * 1. Cart creation without authentication requirements
 * 2. Proper default values for guest cart initialization
 * 3. Unique cart ID generation for session tracking
 * 4. Initial status configuration for active shopping session
 * 5. Cart item counters initialized to zero
 * 6. Timestamp generation for cart lifecycle management
 * 7. Support for optional guest preferences and notes
 *
 * The test demonstrates the core cart creation functionality that enables
 * seamless multi-seller shopping experiences for anonymous users while
 * maintaining proper session tracking and analytics capabilities.
 */
export async function test_api_cart_creation_for_guest_user(
  connection: api.IConnection,
) {
  // Create cart with minimal guest configuration
  const cart = await api.functional.shoppingMall.carts.create(connection, {
    body: {
      customer_notes: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
    } satisfies IShoppingMallCart.ICreate,
  });

  // Validate cart creation response
  typia.assert(cart);

  // Verify core cart properties
  TestValidator.predicate("cart status is active", cart.status === "active");
  TestValidator.equals("total item count is zero", cart.total_item_count, 0);
  TestValidator.equals(
    "total product count is zero",
    cart.total_product_count,
    0,
  );
  TestValidator.equals(
    "cart is not locked for checkout",
    cart.is_locked_for_checkout,
    false,
  );
  TestValidator.predicate(
    "converted_at is null for new cart",
    cart.converted_at === null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    cart.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    cart.updated_at.length > 0,
  );
  TestValidator.predicate(
    "last_activity_at timestamp exists",
    cart.last_activity_at.length > 0,
  );

  // Verify optional fields handling
  TestValidator.predicate(
    "deleted_at is null by default",
    cart.deleted_at === null,
  );

  // Test cart creation with additional guest preferences
  const enhancedCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: "fedex_standard",
        promotional_codes: "WELCOME10,FIRSTORDER",
        customer_notes: "Please deliver during business hours",
      } satisfies IShoppingMallCart.ICreate,
    },
  );

  typia.assert(enhancedCart);

  // Verify enhanced configuration is preserved
  TestValidator.equals(
    "enhanced cart has same active status",
    enhancedCart.status,
    "active",
  );
  TestValidator.equals(
    "enhanced cart has zero items",
    enhancedCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "enhanced cart has zero products",
    enhancedCart.total_product_count,
    0,
  );

  // Verify that multiple carts get unique IDs
  TestValidator.notEquals(
    "different carts have different IDs",
    cart.id,
    enhancedCart.id,
  );

  // Validate cart lifecycle timestamps are properly set
  TestValidator.predicate(
    "creation timestamp is recent",
    new Date(enhancedCart.created_at).getTime() > Date.now() - 60000,
  );

  TestValidator.predicate(
    "update timestamp equals creation timestamp for new cart",
    enhancedCart.created_at === enhancedCart.updated_at,
  );
}
