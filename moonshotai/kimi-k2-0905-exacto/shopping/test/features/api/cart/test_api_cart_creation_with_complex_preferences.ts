import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test cart creation with complex customer preferences including JSON
 * configuration objects for multiple product categories, address-specific
 * shipping preferences, and promotional code stacking scenarios. Verify proper
 * preference parsing, validation, and application throughout the cart lifecycle
 * while maintaining customer experience quality.
 *
 * This test validates the shopping cart creation API with comprehensive
 * preference configurations:
 *
 * 1. Create cart with complex shipping preference JSON containing
 *    category-specific delivery methods
 * 2. Test promotional code stacking with multiple discount configurations
 * 3. Validate customer notes for special handling and delivery instructions
 * 4. Verify cart initialization with proper default values and status
 * 5. Test preference parsing and validation during cart creation
 *
 * The test ensures that complex JSON configurations are properly handled and
 * that the cart system maintains flexibility for various customer preference
 * scenarios.
 */
export async function test_api_cart_creation_with_complex_preferences(
  connection: api.IConnection,
) {
  // Complex shipping preference JSON for multiple product categories
  const complexShippingPreference = JSON.stringify({
    categories: {
      electronics: {
        method: "expedited",
        carrier: "fedex",
        deliverySpeed: "2-day",
        insurance: true,
        signatureRequired: true,
      },
      clothing: {
        method: "standard",
        carrier: "usps",
        deliverySpeed: "5-7 days",
        insurance: false,
        signatureRequired: false,
      },
      perishables: {
        method: "express",
        carrier: "ups",
        deliverySpeed: "overnight",
        temperatureControl: true,
        deliveryWindow: "morning",
      },
    },
    defaultMethod: "standard",
    internationalHandling: {
      customsDeclaration: true,
      dutiesPaid: "sender",
      preferredBroker: "dhl_express",
    },
  });

  // Promotional codes JSON with stacking configuration
  const promotionalCodes = JSON.stringify([
    {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      appliesTo: "entire_cart",
      expiresAt: "2024-12-31T23:59:59Z",
      minimumOrder: 50,
    },
    {
      code: "FREESHIP2024",
      type: "shipping",
      value: 0,
      appliesTo: "shipping_cost",
      expiresAt: "2024-12-31T23:59:59Z",
      maximumDiscount: 25,
    },
    {
      code: "CATEGORY5",
      type: "category_percentage",
      value: 5,
      appliesTo: "electronics",
      expiresAt: "2024-11-30T23:59:59Z",
      stackable: true,
    },
  ]);

  // Customer notes with special instructions
  const customerNotes = `Gift wrapping requested for electronics items. 
Please handle fragile items with care. 
Morning delivery preferred between 9-11 AM. 
Contact customer 30 minutes before arrival.
Special delivery instructions: Leave with concierge if not home.`;

  // Create cart with complex preferences
  const createCartBody = {
    customer_shipping_preference: complexShippingPreference,
    promotional_codes: promotionalCodes,
    customer_notes: customerNotes,
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: createCartBody,
    });

  // Validate the created cart
  typia.assert(cart);

  // Verify cart properties
  TestValidator.equals(
    "cart should have zero items initially",
    cart.total_item_count,
    0,
  );
  TestValidator.equals(
    "cart should have zero products initially",
    cart.total_product_count,
    0,
  );
  TestValidator.equals("cart status should be active", cart.status, "active");
  TestValidator.equals(
    "cart should not be locked for checkout",
    cart.is_locked_for_checkout,
    false,
  );
  TestValidator.predicate("cart should have valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      cart.id,
    ),
  );

  // Verify complex preferences are properly stored
  TestValidator.equals(
    "shipping preference should match input",
    cart.customer_shipping_preference,
    complexShippingPreference,
  );
  TestValidator.equals(
    "promotional codes should match input",
    cart.promotional_codes,
    promotionalCodes,
  );
  TestValidator.equals(
    "customer notes should match input",
    cart.customer_notes,
    customerNotes,
  );

  // Verify timestamps are set
  TestValidator.predicate(
    "created_at should be valid date",
    () => !isNaN(Date.parse(cart.created_at)),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !isNaN(Date.parse(cart.updated_at)),
  );
  TestValidator.predicate(
    "last_activity_at should be valid date",
    () => !isNaN(Date.parse(cart.last_activity_at)),
  );

  // Test cart creation with minimal preferences
  const minimalCartBody = {
    customer_shipping_preference: JSON.stringify({ method: "standard" }),
    promotional_codes: JSON.stringify([
      { code: "SIMPLE10", type: "percentage", value: 10 },
    ]),
    customer_notes: "Standard delivery",
  } satisfies IShoppingMallCart.ICreate;

  const minimalCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: minimalCartBody,
    });

  typia.assert(minimalCart);
  TestValidator.equals(
    "minimal cart should also start with zero items",
    minimalCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "minimal cart should be active",
    minimalCart.status,
    "active",
  );

  // Test cart creation with null preferences
  const nullCartBody = {
    customer_shipping_preference: null,
    promotional_codes: null,
    customer_notes: null,
  } satisfies IShoppingMallCart.ICreate;

  const nullCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: nullCartBody,
    });

  typia.assert(nullCart);
  TestValidator.equals(
    "null cart should have null preferences",
    nullCart.customer_shipping_preference,
    null,
  );
  TestValidator.equals(
    "null cart should have null promotional codes",
    nullCart.promotional_codes,
    null,
  );
  TestValidator.equals(
    "null cart should have null customer notes",
    nullCart.customer_notes,
    null,
  );
}
