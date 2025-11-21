import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test basic shopping cart creation for guest users
 *
 * Validates fundamental cart initialization workflow for the millions of
 * marketplace customers who begin their shopping experience without
 * authentication. Ensures proper cart session establishment with UUID
 * identifier, default value initialization, and status configuration.
 *
 * Test Process:
 *
 * 1. Create a new shopping cart for guest user
 * 2. Validate cart response contains required fields
 * 3. Verify UUID format and uniqueness
 * 4. Confirm proper default value initialization
 * 5. Validate cart status and lock configuration
 * 6. Test optional configuration fields
 * 7. Verify timestamp and lifecycle management
 */
export async function test_api_cart_creation_basic_guest(
  connection: api.IConnection,
) {
  // Step 1: Create basic shopping cart without optional configuration
  const basicCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {} satisfies IShoppingMallCart.ICreate,
  });

  // Validate cart response structure and required fields
  typia.assert(basicCart);

  // Step 2: Validate cart ID is proper UUID format
  TestValidator.predicate(
    "basic cart has valid UUID format",
    !isNaN(Date.parse(basicCart.created_at)) && basicCart.id.length === 36,
  );

  // Step 3: Confirm empty cart initialization
  TestValidator.equals(
    "basic cart has zero total items",
    basicCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "basic cart has zero product count",
    basicCart.total_product_count,
    0,
  );

  // Step 4: Validate cart status and default configuration
  TestValidator.equals("cart status is active", basicCart.status, "active");
  TestValidator.equals(
    "checkout lock is disabled by default",
    basicCart.is_locked_for_checkout,
    false,
  );

  // Step 5: Test cart creation with optional customer preferences
  const requestBodyWithPreferences = {
    customer_shipping_preference: JSON.stringify({
      method: "standard",
      carrier: "UPS",
      delivery_speed: "ground",
    }),
    customer_notes: "Please deliver during business hours",
  } satisfies IShoppingMallCart.ICreate;

  const cartWithPreferences = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: requestBodyWithPreferences,
    },
  );

  // Validate cart with preferences maintains proper initialization
  typia.assert(cartWithPreferences);
  TestValidator.equals(
    "cart with preferences has zero items",
    cartWithPreferences.total_item_count,
    0,
  );

  // Step 6: Test cart creation with promotional codes
  const requestBodyWithPromo = {
    promotional_codes: JSON.stringify([
      { code: "WELCOME10", type: "percentage", value: 10 },
      { code: "FREESHIP", type: "shipping", min_order: 50 },
    ]),
  } satisfies IShoppingMallCart.ICreate;

  const cartWithPromo = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: requestBodyWithPromo,
    },
  );

  typia.assert(cartWithPromo);
  TestValidator.equals(
    "cart with promotional codes has zero items",
    cartWithPromo.total_item_count,
    0,
  );

  // Step 7: Verify timestamp management for all carts
  const allCarts = [basicCart, cartWithPreferences, cartWithPromo];

  for (const cart of allCarts) {
    TestValidator.predicate(
      "cart has valid creation timestamp",
      !isNaN(Date.parse(cart.created_at)),
    );
    TestValidator.predicate(
      "cart has valid update timestamp",
      !isNaN(Date.parse(cart.updated_at)),
    );
    TestValidator.predicate(
      "cart has valid activity timestamp",
      !isNaN(Date.parse(cart.last_activity_at)),
    );

    // Validate lifecycle management - created and updated should be close
    const timeDiff = Math.abs(
      Date.parse(cart.updated_at) - Date.parse(cart.created_at),
    );
    TestValidator.predicate(
      "cart updated_at is close to created_at",
      timeDiff <= 5000,
    ); // Within 5 seconds
  }

  // Step 8: Verify UUID uniqueness across all created carts
  TestValidator.notEquals(
    "basic cart ID is unique",
    basicCart.id,
    cartWithPreferences.id,
  );
  TestValidator.notEquals(
    "cart with promo ID is unique",
    cartWithPromo.id,
    basicCart.id,
  );
  TestValidator.notEquals(
    "cart with preferences ID is unique",
    cartWithPreferences.id,
    cartWithPromo.id,
  );

  // Step 9: Validate optional nullable fields handling
  for (const cart of allCarts) {
    TestValidator.predicate(
      "optional converted_at is null or undefined",
      cart.converted_at === null || cart.converted_at === undefined,
    );
    TestValidator.predicate(
      "optional expires_at is null or undefined",
      cart.expires_at === null || cart.expires_at === undefined,
    );
    TestValidator.predicate(
      "optional deleted_at is null or undefined",
      cart.deleted_at === null || cart.deleted_at === undefined,
    );
  }
}
