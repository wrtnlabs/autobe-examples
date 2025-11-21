import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test comprehensive cart creation with full preference configuration.
 *
 * Validates shopping cart initialization with complete customer shipping
 * preferences, promotional code application, and detailed customer notes. Tests
 * JSON configuration handling for complex shipping scenarios including
 * multi-seller considerations. Validates promotional code validation during
 * cart creation and proper configuration storage. Ensures all optional
 * parameters are properly processed and reflected in the created cart
 * response.
 *
 * Test scenarios:
 *
 * 1. Basic cart creation with minimal configuration
 * 2. Comprehensive cart creation with all preference options
 * 3. JSON data structure validation for preference objects
 * 4. Multi-seller marketplace shipping coordination
 * 5. Complex promotional code scenarios with conditions
 */
export async function test_api_cart_creation_with_preferences(
  connection: api.IConnection,
) {
  // Step 1: Create basic cart with minimal configuration for baseline testing
  const basicCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {} satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(basicCart);

  // Validate basic cart properties establishing baseline functionality
  TestValidator.equals(
    "basic cart total item count is zero",
    basicCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "basic cart total product count is zero",
    basicCart.total_product_count,
    0,
  );
  TestValidator.equals(
    "basic cart status is active",
    basicCart.status,
    "active",
  );
  TestValidator.predicate(
    "basic cart not locked for checkout",
    !basicCart.is_locked_for_checkout,
  );
  TestValidator.equals(
    "basic cart customer shipping preference is null",
    basicCart.customer_shipping_preference,
    null,
  );
  TestValidator.equals(
    "basic cart promotional codes is null",
    basicCart.promotional_codes,
    null,
  );
  TestValidator.equals(
    "basic cart customer notes is null",
    basicCart.customer_notes,
    null,
  );

  // Step 2: Create comprehensive cart with realistic shipping preferences
  const shippingPreference = {
    preferredCarriers: ["UPS", "FedEx", "USPS"],
    deliverySpeed: "standard",
    requireSignature: true,
    multiSellerHandling: "consolidated",
    insurance: true,
    specialInstructions: "Handle with extra care during holiday season",
    priorityShippingLevel: "high",
    packagingPreferences: "eco_friendly_validated",
  };

  const promotionalCodes = [
    {
      code: "WELCOME2024",
      type: "percentage",
      value: 15,
      sellerId: "all",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    },
    {
      code: "FREESHIPPING2024",
      type: "shipping",
      value: 0,
      sellerId: "marketplace_wide",
      eligibleOrderThreshold: 50,
    },
  ];

  const comprehensiveCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: JSON.stringify(shippingPreference),
        promotional_codes: JSON.stringify(promotionalCodes),
        customer_notes:
          "Please coordinate delivery timing across multiple sellers. Gift wrapping may be required for certain items.",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(comprehensiveCart);

  // Validate comprehensive cart configuration integrity
  TestValidator.notEquals(
    "comprehensive cart has different ID",
    basicCart.id,
    comprehensiveCart.id,
  );
  TestValidator.equals(
    "comprehensive cart status is active",
    comprehensiveCart.status,
    "active",
  );
  TestValidator.predicate(
    "comprehensive cart not locked for checkout",
    !comprehensiveCart.is_locked_for_checkout,
  );

  // Validate preference storage and data integrity
  TestValidator.notEquals(
    "shipping preference is stored",
    comprehensiveCart.customer_shipping_preference,
    null,
  );
  TestValidator.notEquals(
    "promotional codes are stored",
    comprehensiveCart.promotional_codes,
    null,
  );
  TestValidator.notEquals(
    "customer notes are stored",
    comprehensiveCart.customer_notes,
    null,
  );

  // Parse and validate stored JSON configurations with enhanced validation
  const storedShippingPreference = JSON.parse(
    comprehensiveCart.customer_shipping_preference!,
  );
  const storedPromotionalCodes = JSON.parse(
    comprehensiveCart.promotional_codes!,
  );

  TestValidator.equals(
    "shipping preference carriers count",
    storedShippingPreference.preferredCarriers.length,
    3,
  );
  TestValidator.equals(
    "shipping preference delivery speed",
    storedShippingPreference.deliverySpeed,
    shippingPreference.deliverySpeed,
  );
  TestValidator.equals(
    "shipping preference signature requirement",
    storedShippingPreference.requireSignature,
    shippingPreference.requireSignature,
  );
  TestValidator.equals(
    "shipping preference multi-seller handling",
    storedShippingPreference.multiSellerHandling,
    shippingPreference.multiSellerHandling,
  );
  TestValidator.equals(
    "shipping preference insurance",
    storedShippingPreference.insurance,
    shippingPreference.insurance,
  );
  TestValidator.equals(
    "shipping preference instructions",
    storedShippingPreference.specialInstructions,
    shippingPreference.specialInstructions,
  );
  TestValidator.equals(
    "shipping preference priority level",
    storedShippingPreference.priorityShippingLevel,
    shippingPreference.priorityShippingLevel,
  );
  TestValidator.equals(
    "shipping preference packaging",
    storedShippingPreference.packagingPreferences,
    shippingPreference.packagingPreferences,
  );

  TestValidator.equals(
    "promotional codes count",
    storedPromotionalCodes.length,
    promotionalCodes.length,
  );
  TestValidator.equals(
    "first promo code",
    storedPromotionalCodes[0].code,
    promotionalCodes[0].code,
  );
  TestValidator.equals(
    "first promo type",
    storedPromotionalCodes[0].type,
    promotionalCodes[0].type,
  );
  TestValidator.equals(
    "first promo value",
    storedPromotionalCodes[0].value,
    promotionalCodes[0].value,
  );
  TestValidator.equals(
    "first promo seller",
    storedPromotionalCodes[0].sellerId,
    promotionalCodes[0].sellerId,
  );
  TestValidator.equals(
    "second promo code",
    storedPromotionalCodes[1].code,
    promotionalCodes[1].code,
  );
  TestValidator.equals(
    "second promo type",
    storedPromotionalCodes[1].type,
    promotionalCodes[1].type,
  );

  TestValidator.equals(
    "customer notes content validation",
    comprehensiveCart.customer_notes,
    "Please coordinate delivery timing across multiple sellers. Gift wrapping may be required for certain items.",
  );

  // Step 3: Test sophisticated multi-seller marketplace workflow
  const complexShippingConfig = {
    multiSellerMarketplace: {
      strategy: "separate_shipments_coordinates",
      packagingPreferences: {
        seller_001: "eco_friendly_premium",
        seller_002: "standard_protection",
        seller_003: "luxury_gift_packaging",
      },
      deliveryScheduling: {
        allowPartialShipments: true,
        consolidatePackages: false,
        priorityOrdering: ["seller_001", "seller_003", "seller_002"],
        estimatedDeliveryWindows: {
          standard: "3-5 business days",
          expedited: "1-2 business days",
        },
      },
    },
    internationalShipping: {
      customsDeclaration: "pre_filled_maximum_detail",
      documentation: "full_commercial_shipping_documentation",
      dutiesPreparation: "employer_of_record_services",
      harmonizedSystemCodes: "auto_determined",
    },
    addressProcessing: {
      validationLevel: "normalized_geocoded_verified",
      formatStandardization: "international_postal_standards",
      geolocationAccuracy: "plus_minus_five_meters",
      multiLanguageSupport: true,
    },
  };

  const complexPromotionalScenario = [
    {
      code: "MULTISELLER_2024",
      type: "complex_combined",
      value: 25,
      sellerId: "multi_seller_aggregation",
      eligibility: {
        minItemsThreshold: 3,
        maxItemsThreshold: 20,
        multiSellerRequired: true,
        minSellerCount: 2,
        categoryRestrictions: ["electronics", "homeware", "gifts"],
      },
      validationMeta: {
        validityPeriod: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        },
        usageLimitations: "one_per_order_per_customer",
        redemptionChannels: ["web", "mobile_app"],
      },
    },
  ];

  const complexCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: JSON.stringify(complexShippingConfig),
        promotional_codes: JSON.stringify(complexPromotionalScenario),
        customer_notes:
          "Sophisticated multi-seller marketplace order coordination required. Implement staggered delivery across three sellers with gift wrapping and international customs documentation. Validate harmonized system codes for international shipping compliance.",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(complexCart);

  // Validate complex multi-seller configuration with marketplace-specific validation
  TestValidator.notEquals(
    "complex cart unique ID generated",
    basicCart.id,
    complexCart.id,
  );
  TestValidator.notEquals(
    "complex cart differs from comprehensive",
    comprehensiveCart.id,
    complexCart.id,
  );

  const storedComplexConfig = JSON.parse(
    complexCart.customer_shipping_preference!,
  );
  const storedComplexPromos = JSON.parse(complexCart.promotional_codes!);

  // Validate sophisticated marketplace configuration structure
  TestValidator.equals(
    "complex config strategy set",
    storedComplexConfig.multiSellerMarketplace.strategy,
    complexShippingConfig.multiSellerMarketplace.strategy,
  );
  TestValidator.equals(
    "complex config packaging preferences detailed",
    storedComplexConfig.multiSellerMarketplace.packagingPreferences,
    complexShippingConfig.multiSellerMarketplace.packagingPreferences,
  );
  TestValidator.equals(
    "complex config delivery scheduling sophisticated",
    storedComplexConfig.multiSellerMarketplace.deliveryScheduling,
    complexShippingConfig.multiSellerMarketplace.deliveryScheduling,
  );
  TestValidator.equals(
    "complex config international shipping professional",
    storedComplexConfig.internationalShipping,
    complexShippingConfig.internationalShipping,
  );
  TestValidator.equals(
    "complex config address processing advanced",
    storedComplexConfig.addressProcessing,
    complexShippingConfig.addressProcessing,
  );

  TestValidator.equals(
    "complex promo type is combined sophisticated",
    storedComplexPromos[0].type,
    "complex_combined",
  );
  TestValidator.predicate(
    "complex promo has advanced eligibility",
    storedComplexPromos[0].eligibility !== undefined,
  );
  TestValidator.equals(
    "complex promo eligibility seller requirements",
    storedComplexPromos[0].eligibility.multiSellerRequired,
    true,
  );
  TestValidator.equals(
    "complex promo required seller count",
    storedComplexPromos[0].eligibility.minSellerCount,
    2,
  );
  TestValidator.equals(
    "complex promo category restrictions",
    storedComplexPromos[0].eligibility.categoryRestrictions.length,
    3,
  );
  TestValidator.predicate(
    "complex promo includes validation meta",
    storedComplexPromos[0].validationMeta !== undefined,
  );
  TestValidator.predicate(
    "complex promo has usage limitations",
    storedComplexPromos[0].validationMeta.usageLimitations !== undefined,
  );
}
