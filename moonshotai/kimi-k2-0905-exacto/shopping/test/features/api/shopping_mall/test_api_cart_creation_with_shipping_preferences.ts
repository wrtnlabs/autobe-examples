import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation with comprehensive shipping preference
 * configuration. Validates JSON-based shipping preference storage including
 * carrier choices, delivery speed options, and special handling instructions.
 * Tests that customer shipping preferences are properly stored and retrievable
 * for multi-seller cart scenarios. Ensures complex shipping profiles are
 * supported for customers with specific delivery needs including expedited
 * shipping, multiple carrier options, and address-specific delivery
 * instructions that enhance the overall shopping experience across marketplace
 * vendors.
 */
export async function test_api_cart_creation_with_shipping_preferences(
  connection: api.IConnection,
) {
  // Test 1: Create a cart with comprehensive shipping preferences
  const comprehensiveShippingPreference = JSON.stringify({
    carrier: "UPS",
    deliverySpeed: "expedited_2day",
    specialInstructions: "Leave package at front door, ring doorbell",
    deliveryWindow: {
      preferredDays: ["monday", "tuesday", "friday"],
      preferredTime: "afternoon",
      avoidWeekends: true,
    },
    packageHandling: {
      fragile: true,
      climateControlled: false,
      signatureRequired: false,
    },
    alternateDeliveryLocations: ["neighbor_123", "locker_box_456"],
  });

  const promotionalCodes = JSON.stringify([
    {
      code: "FREESHIP2024",
      type: "shipping_discount",
      value: 15,
      applicableTo: "all_sellers",
    },
    {
      code: "MARKETPLACE10",
      type: "percentage_discount",
      value: 10,
      applicableTo: "marketplace_wide",
    },
  ]);

  const customerNotes =
    "Please coordinate delivery timing as I'm often not home during standard business hours. Weekend delivery preferred if available. Contact me via phone for delivery scheduling.";

  const cartWithComprehensivePreferences =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: comprehensiveShippingPreference,
        promotional_codes: promotionalCodes,
        customer_notes: customerNotes,
      } satisfies IShoppingMallCart.ICreate,
    });

  typia.assert(cartWithComprehensivePreferences);

  // Validate all properties are set correctly
  TestValidator.equals(
    "cart created with comprehensive shipping preferences",
    cartWithComprehensivePreferences.customer_shipping_preference,
    comprehensiveShippingPreference,
  );
  TestValidator.equals(
    "cart promotional codes stored correctly",
    cartWithComprehensivePreferences.promotional_codes,
    promotionalCodes,
  );
  TestValidator.equals(
    "customer notes stored correctly",
    cartWithComprehensivePreferences.customer_notes,
    customerNotes,
  );

  // Verify cart initialization properties
  TestValidator.predicate(
    "total item count initialized to 0",
    cartWithComprehensivePreferences.total_item_count === 0,
  );
  TestValidator.predicate(
    "total product count initialized to 0",
    cartWithComprehensivePreferences.total_product_count === 0,
  );
  TestValidator.equals(
    "cart status should be active",
    cartWithComprehensivePreferences.status,
    "active",
  );
  TestValidator.predicate(
    "cart should not be locked for checkout",
    cartWithComprehensivePreferences.is_locked_for_checkout === false,
  );
  TestValidator.predicate(
    "conversion timestamp should be null",
    cartWithComprehensivePreferences.converted_at === null,
  );
  TestValidator.predicate(
    "deletion timestamp should be null",
    cartWithComprehensivePreferences.deleted_at === null,
  );

  // Test 2: Create a cart with minimal shipping preferences
  const minimalShippingPreference = JSON.stringify({
    carrier: "USPS",
    deliverySpeed: "standard",
  });

  const cartWithMinimalPreferences =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: minimalShippingPreference,
        promotional_codes: null,
        customer_notes: "",
      } satisfies IShoppingMallCart.ICreate,
    });

  typia.assert(cartWithMinimalPreferences);

  TestValidator.equals(
    "cart created with minimal shipping preferences",
    cartWithMinimalPreferences.customer_shipping_preference,
    minimalShippingPreference,
  );
  TestValidator.predicate(
    "minimal cart should have null promotional codes",
    cartWithMinimalPreferences.promotional_codes === null,
  );
  TestValidator.equals(
    "minimal cart should have empty customer notes",
    cartWithMinimalPreferences.customer_notes,
    "",
  );

  // Test 3: Create a cart with null shipping preferences (default behavior)
  const cartWithDefaults = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: null,
        promotional_codes: null,
        customer_notes: null,
      } satisfies IShoppingMallCart.ICreate,
    },
  );

  typia.assert(cartWithDefaults);

  TestValidator.predicate(
    "default cart should have null shipping preference",
    cartWithDefaults.customer_shipping_preference === null,
  );
  TestValidator.predicate(
    "default cart should have null promotional codes",
    cartWithDefaults.promotional_codes === null,
  );
  TestValidator.predicate(
    "default cart should have null customer notes",
    cartWithDefaults.customer_notes === null,
  );

  // Test 4: Create a cart with multi-seller specific shipping preferences
  const multiSellerShippingPreference = JSON.stringify({
    carrier: "FedEx",
    deliverySpeed: "express_overnight",
    sellerSpecific: {
      seller_123: {
        preferredMethod: "pickup",
        pickupLocation: "Store A, 123 Main St",
      },
      seller_456: {
        preferredMethod: "delivery",
        deliveryInstructions: "Rear entrance, call upon arrival",
      },
    },
  });

  const cartWithMultiSellerPreferences =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: multiSellerShippingPreference,
        promotional_codes: JSON.stringify([
          { code: "MULTI15", type: "percentage", value: 15 },
        ]),
        customer_notes:
          "Mixed delivery method requested - some items for pickup, others for delivery",
      } satisfies IShoppingMallCart.ICreate,
    });

  typia.assert(cartWithMultiSellerPreferences);

  TestValidator.equals(
    "cart supports multi-seller shipping preferences",
    cartWithMultiSellerPreferences.customer_shipping_preference,
    multiSellerShippingPreference,
  );

  // Test 5: Create a cart with international shipping preferences
  const internationalShippingPreference = JSON.stringify({
    carrier: "DHL",
    deliverySpeed: "international_express",
    customs: {
      declarationType: "commercial",
      insurance: {
        required: true,
        value: 1000.0,
        coverage: "full_replacement",
      },
    },
    tracking: {
      preferred: "detailed",
      notificationTypes: ["email", "sms", "app_push"],
      frequency: "all_milestones",
    },
    dutiesHandling: {
      prePay: true,
      taxType: "duties_and_taxes",
      estimatedClearanceTime: 3,
    },
  });

  const cartWithInternationalPreferences =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: internationalShippingPreference,
        promotional_codes: null,
        customer_notes:
          "International shipping to Canada, customs value $1000, please pre-pay duties",
      } satisfies IShoppingMallCart.ICreate,
    });

  typia.assert(cartWithInternationalPreferences);

  TestValidator.equals(
    "cart supports international shipping preferences",
    cartWithInternationalPreferences.customer_shipping_preference,
    internationalShippingPreference,
  );

  // Test 6: Verify that shipping preferences are stored as strings (JSON serialization)
  TestValidator.predicate(
    "shipping preferences must be stored as string - comprehensive test",
    typeof cartWithComprehensivePreferences.customer_shipping_preference ===
      "string",
  );
  TestValidator.predicate(
    "shipping preferences must be stored as string - minimal test",
    typeof cartWithMinimalPreferences.customer_shipping_preference === "string",
  );
  TestValidator.predicate(
    "shipping preferences must be stored as string - multi-seller test",
    typeof cartWithMultiSellerPreferences.customer_shipping_preference ===
      "string",
  );
  TestValidator.predicate(
    "shipping preferences must be stored as string - international test",
    typeof cartWithInternationalPreferences.customer_shipping_preference ===
      "string",
  );

  // Test 7: Test that promotional codes are also JSON serialized
  TestValidator.predicate(
    "promotional codes should be JSON string when provided",
    cartWithComprehensivePreferences.promotional_codes !== null &&
      typeof cartWithComprehensivePreferences.promotional_codes === "string",
  );
  TestValidator.predicate(
    "promotional codes null when not provided",
    cartWithMinimalPreferences.promotional_codes === null,
  );

  // Test 8: Verify cart timestamps and lifecycle properties
  TestValidator.predicate(
    "created_at should be populated",
    cartWithComprehensivePreferences.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be populated",
    cartWithComprehensivePreferences.updated_at !== null,
  );
  TestValidator.predicate(
    "last_activity_at should be populated",
    cartWithComprehensivePreferences.last_activity_at !== null,
  );
  TestValidator.predicate(
    "timestamps should be recent",
    new Date(cartWithComprehensivePreferences.created_at).getTime() <=
      Date.now(),
  );
  TestValidator.predicate(
    "updated_at should be >= created_at",
    new Date(cartWithComprehensivePreferences.updated_at).getTime() >=
      new Date(cartWithComprehensivePreferences.created_at).getTime(),
  );

  // Test 9: Create cart with empty shipping preference string
  const cartWithEmptyShippingPref =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: "",
        promotional_codes: JSON.stringify([]),
        customer_notes: null,
      } satisfies IShoppingMallCart.ICreate,
    });

  typia.assert(cartWithEmptyShippingPref);

  TestValidator.equals(
    "cart accepts empty shipping preference string",
    cartWithEmptyShippingPref.customer_shipping_preference,
    "",
  );
  TestValidator.equals(
    "cart accepts empty promotional codes array",
    cartWithEmptyShippingPref.promotional_codes,
    JSON.stringify([]),
  );
}
