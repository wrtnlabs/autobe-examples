import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test cart creation including promotional code application and initial
 * discount configuration setup.
 *
 * This comprehensive test validates the complete cart creation workflow with
 * promotional code functionality:
 *
 * 1. Test basic cart creation without promotional codes
 * 2. Test cart creation with valid promotional codes
 * 3. Test cart initialization with customer preferences
 * 4. Validate cart response structure and initial state
 * 5. Verify promotional code handling in multi-vendor scenarios
 */
export async function test_api_cart_creation_with_promotional_codes(
  connection: api.IConnection,
) {
  // Step 1: Create basic cart without promotional codes
  const basicCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {
      customer_shipping_preference: JSON.stringify({
        method: "standard",
        instructions: "Please handle with care",
      }),
      customer_notes: "Initial test cart creation",
    } satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(basicCart);

  // Validate basic cart properties
  TestValidator.predicate("basic cart has valid ID", basicCart.id.length > 0);
  TestValidator.predicate(
    "basic cart has zero items initially",
    basicCart.total_item_count === 0,
  );
  TestValidator.predicate(
    "basic cart has zero products initially",
    basicCart.total_product_count === 0,
  );
  TestValidator.equals(
    "basic cart status is active",
    basicCart.status,
    "active",
  );
  TestValidator.equals(
    "basic cart is not locked",
    basicCart.is_locked_for_checkout,
    false,
  );
  TestValidator.predicate(
    "basic cart has created_at timestamp",
    basicCart.created_at !== null && basicCart.created_at !== undefined,
  );
  TestValidator.predicate(
    "basic cart has last_activity_at timestamp",
    basicCart.last_activity_at !== null &&
      basicCart.last_activity_at !== undefined,
  );

  // Step 2: Create cart with promotional codes
  const promotionalCodes = JSON.stringify([
    {
      code: "WELCOME10",
      description: "Welcome discount",
      discount_type: "percentage",
      discount_value: 10,
      valid_until: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      min_order_value: 50,
      applicable_sellers: ["all"],
    },
    {
      code: "FREESHIP2024",
      description: "Free shipping",
      discount_type: "fixed",
      discount_value: 0,
      valid_until: new Date(
        Date.now() + 15 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      min_order_value: 25,
      applicable_sellers: ["marketplace"],
    },
  ]);

  const cartWithPromotions = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes: promotionalCodes,
        customer_shipping_preference: JSON.stringify({
          method: "expedited",
          carrier: "express",
          estimated_delivery: "2-3 business days",
        }),
        customer_notes:
          "Cart with promotional codes for testing multi-vendor marketplace",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithPromotions);

  // Validate promotional cart properties
  TestValidator.predicate(
    "promotional cart has valid ID",
    cartWithPromotions.id.length > 0,
  );
  TestValidator.predicate(
    "promotional cart has zero items initially",
    cartWithPromotions.total_item_count === 0,
  );
  TestValidator.predicate(
    "promotional cart has zero products initially",
    cartWithPromotions.total_product_count === 0,
  );
  TestValidator.equals(
    "promotional cart status is active",
    cartWithPromotions.status,
    "active",
  );
  TestValidator.equals(
    "promotional cart is not locked",
    cartWithPromotions.is_locked_for_checkout,
    false,
  );

  // Validate promotional codes are stored
  TestValidator.predicate(
    "promotional cart has promotional codes stored",
    cartWithPromotions.promotional_codes !== null &&
      cartWithPromotions.promotional_codes !== undefined,
  );
  TestValidator.equals(
    "promotional codes match input",
    cartWithPromotions.promotional_codes,
    promotionalCodes,
  );

  // Step 3: Test cart with customer preferences
  const customerPreferences = JSON.stringify({
    shipping: {
      preferred_method: "overnight",
      address_type: "residential",
      signature_required: false,
    },
    notifications: {
      order_updates: true,
      shipping_updates: true,
      promotion_emails: false,
    },
  });

  const cartWithPreferences = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: customerPreferences,
        promotional_codes: null,
        customer_notes: "Cart with detailed customer preferences for testing",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithPreferences);

  // Validate customer preferences cart
  TestValidator.predicate(
    "preferences cart has valid ID",
    cartWithPreferences.id.length > 0,
  );
  TestValidator.equals(
    "preferences cart has correct shipping preference",
    cartWithPreferences.customer_shipping_preference,
    customerPreferences,
  );
  TestValidator.equals(
    "preferences cart has no promotional codes",
    cartWithPreferences.promotional_codes,
    null,
  );
  TestValidator.equals(
    "preferences cart has correct notes",
    cartWithPreferences.customer_notes,
    "Cart with detailed customer preferences for testing",
  );

  // Step 4: Test multi-vendor marketplace scenario
  const multiVendorPromotionalCodes = JSON.stringify([
    {
      code: "SELLER1FLASH",
      description: "Flash sale for seller 1",
      discount_type: "percentage",
      discount_value: 25,
      valid_until: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      min_order_value: 75,
      applicable_sellers: ["seller-001"],
    },
    {
      code: "GLOBALD15",
      description: "Global discount 15%",
      discount_type: "percentage",
      discount_value: 15,
      valid_until: new Date(
        Date.now() + 20 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      min_order_value: 100,
      applicable_sellers: ["all"],
    },
  ]);

  const multiVendorCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes: multiVendorPromotionalCodes,
        customer_shipping_preference: JSON.stringify({
          method: "standard",
          tracking: true,
          consolidate_packages: true,
        }),
        customer_notes:
          "Testing multi-vendor marketplace with specific promotional codes",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(multiVendorCart);

  // Validate multi-vendor cart
  TestValidator.predicate(
    "multi-vendor cart has valid UUID",
    typia.is<string & tags.Format<"uuid">>(multiVendorCart.id),
  );
  TestValidator.predicate(
    "multi-vendor cart has zero items initially",
    multiVendorCart.total_item_count === 0,
  );
  TestValidator.predicate(
    "multi-vendor cart has zero products initially",
    multiVendorCart.total_product_count === 0,
  );

  // Validate timestamps
  TestValidator.predicate(
    "multi-vendor cart has created_at timestamp",
    new Date(multiVendorCart.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "multi-vendor cart has last_activity_at timestamp",
    new Date(multiVendorCart.last_activity_at).getTime() > 0,
  );

  // Validate that undefined optional properties are handled correctly
  TestValidator.equals(
    "multi-vendor cart has no converted_at timestamp",
    multiVendorCart.converted_at,
    undefined,
  );
  TestValidator.equals(
    "multi-vendor cart has no deleted_at timestamp",
    multiVendorCart.deleted_at,
    undefined,
  );

  // Test error scenario: invalid promotional code format
  await TestValidator.error(
    "should handle invalid promotional code format",
    async () => {
      await api.functional.shoppingMall.carts.create(connection, {
        body: {
          promotional_codes: "invalid-json-string",
          customer_notes: "Testing with invalid promotional codes",
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Step 5: Compare all created carts
  const allCarts = [
    basicCart,
    cartWithPromotions,
    cartWithPreferences,
    multiVendorCart,
  ];

  // Ensure each cart has unique ID
  const uniqueIds = new Set(allCarts.map((cart) => cart.id));
  TestValidator.equals(
    "all carts have unique IDs",
    uniqueIds.size,
    allCarts.length,
  );

  // Ensure all carts have same initial state
  for (const cart of allCarts) {
    TestValidator.predicate(
      `cart ${cart.id} has zero items initially`,
      cart.total_item_count === 0,
    );
    TestValidator.predicate(
      `cart ${cart.id} has zero products initially`,
      cart.total_product_count === 0,
    );
    TestValidator.equals(
      `cart ${cart.id} status is active`,
      cart.status,
      "active",
    );
    TestValidator.equals(
      `cart ${cart.id} is not locked`,
      cart.is_locked_for_checkout,
      false,
    );
  }

  // Validate response data types
  for (const cart of allCarts) {
    TestValidator.predicate(
      `cart ${cart.id} has valid total_item_count type`,
      typeof cart.total_item_count === "number",
    );
    TestValidator.predicate(
      `cart ${cart.id} has valid total_product_count type`,
      typeof cart.total_product_count === "number",
    );
    TestValidator.predicate(
      `cart ${cart.id} has valid status type`,
      typeof cart.status === "string",
    );
    TestValidator.predicate(
      `cart ${cart.id} has valid is_locked_for_checkout type`,
      typeof cart.is_locked_for_checkout === "boolean",
    );
  }
}
