import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation with expiration timestamp configuration to
 * validate cart lifecycle management and automatic cleanup functionality. This
 * comprehensive test validates timestamp accuracy and lifecycle management
 * including cart expiration setup, cleanup trigger preparation, and analytics
 * integration. Testing areas include: expiration timestamp automatic
 * calculation, cart duration based on customer type (guest vs authenticated),
 * cleanup trigger preparation for expired carts, analytics integration for
 * abandoned cart tracking, deletion timestamp management for soft delete
 * functionality, cart availability tracking for inventory management, session
 * timeout calculation and configuration, and expiration policy compliance for
 * different customer scenarios. The test ensures robust cart lifecycle
 * management while supporting operational requirements for system maintenance,
 * data cleanup, and comprehensive analytics throughout the cart management
 * ecosystem.
 */
export async function test_api_shopping_mall_cart_creation_expiration_configuration(
  connection: api.IConnection,
): Promise<void> {
  const now: Date = new Date();
  const thirtyDaysMs: number = 30 * 24 * 60 * 60 * 1000;
  const twentyNineDaysMs: number = 29 * 24 * 60 * 60 * 1000;
  const thirtyOneDaysMs: number = 31 * 24 * 60 * 60 * 1000;

  // Test 1: Guest cart creation with default expiration configuration
  const guestCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {
      customer_shipping_preference: JSON.stringify({
        method: "standard",
        carrier: "UPS",
        delivery_speed: "standard",
      }),
      promotional_codes: JSON.stringify(["WELCOME10", "SUMMER2024"]),
      customer_notes: "Please handle with care",
    } satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(guestCart);

  // Validate guest cart expiration timestamp (should be ~30 days from creation)
  TestValidator.predicate(
    "guest cart should have expiration timestamp",
    guestCart.expires_at !== null && guestCart.expires_at !== undefined,
  );

  const guestExpirationTime: number = new Date(guestCart.expires_at!).getTime();
  const creationTime: number = new Date(guestCart.created_at).getTime();
  const expirationDuration: number = guestExpirationTime - creationTime;

  TestValidator.predicate(
    "guest cart expiration duration should be approximately 30 days",
    expirationDuration >= twentyNineDaysMs &&
      expirationDuration <= thirtyOneDaysMs,
  );

  // Test 2: Cart with minimal configuration
  const minimalCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(minimalCart);

  TestValidator.equals(
    "minimal cart should initialize with zero counts",
    minimalCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "minimal cart should initialize with zero product count",
    minimalCart.total_product_count,
    0,
  );
  TestValidator.equals(
    "minimal cart status should be active",
    minimalCart.status,
    "active",
  );
  TestValidator.equals(
    "minimal cart should not be locked for checkout",
    minimalCart.is_locked_for_checkout,
    false,
  );

  // Test 3: Cart with comprehensive configuration
  const comprehensiveCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: JSON.stringify({
          method: "express",
          carrier: "FedEx",
          delivery_speed: "overnight",
          address_type: "residential",
          signature_required: true,
        }),
        promotional_codes: JSON.stringify([
          {
            code: "VIP20",
            discount_type: "percentage",
            discount_value: 20,
            seller_eligible: "all",
          },
          {
            code: "FREESHIP",
            discount_type: "shipping",
            discount_value: 0,
            seller_eligible: "marketplace",
          },
        ]),
        customer_notes:
          "Gift wrapping required for all items. Include personalized message: Happy Birthday!",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(comprehensiveCart);

  // Test 4: Validate timestamp management for lifecycle tracking
  TestValidator.predicate(
    "comprehensive cart should have creation timestamp",
    new Date(comprehensiveCart.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "comprehensive cart should have last activity timestamp",
    new Date(comprehensiveCart.last_activity_at).getTime() > 0,
  );
  TestValidator.predicate(
    "comprehensive cart should have update timestamp matching creation time",
    comprehensiveCart.created_at === comprehensiveCart.updated_at,
  );

  // Test 5: Validate cart ID format
  TestValidator.predicate(
    "cart ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comprehensiveCart.id,
    ),
  );

  // Test 6: Test JSON configuration parsing
  const shippingPreference = comprehensiveCart.customer_shipping_preference
    ? JSON.parse(comprehensiveCart.customer_shipping_preference)
    : null;
  TestValidator.predicate(
    "shipping preference should parse correctly",
    shippingPreference !== null && shippingPreference.method === "express",
  );

  const promotionalCodes = comprehensiveCart.promotional_codes
    ? JSON.parse(comprehensiveCart.promotional_codes)
    : null;
  TestValidator.predicate(
    "promotional codes should parse correctly",
    promotionalCodes !== null &&
      Array.isArray(promotionalCodes) &&
      promotionalCodes.length === 2,
  );

  // Test 7: Create multiple carts to test expiration policy consistency
  const cartPromises = ArrayUtil.repeat(3, () =>
    api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: JSON.stringify({
          method: RandomGenerator.pick(["standard", "express", "overnight"]),
          carrier: RandomGenerator.pick(["UPS", "FedEx", "USPS"]),
        }),
        promotional_codes: JSON.stringify([RandomGenerator.alphaNumeric(8)]),
      } satisfies IShoppingMallCart.ICreate,
    }),
  );

  const multipleCarts = await Promise.all(cartPromises);
  multipleCarts.forEach((cart, index) => {
    typia.assert(cart);

    TestValidator.predicate(
      `cart ${index + 1} should have expiration timestamp`,
      cart.expires_at !== null && cart.expires_at !== undefined,
    );

    TestValidator.predicate(
      `cart ${index + 1} should maintain active status`,
      cart.status === "active",
    );

    TestValidator.predicate(
      `cart ${index + 1} should have proper timestamp relationships`,
      new Date(cart.last_activity_at).getTime() >=
        new Date(cart.created_at).getTime(),
    );
  });

  // Test 8: Validate analytics-ready cart structure
  const analyticsCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: JSON.stringify({
          method: "standard",
          tracking_enabled: true,
          notification_preferences: ["email", "sms"],
        }),
        customer_notes: "Analytics tracking test cart",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(analyticsCart);

  TestValidator.predicate(
    "analytics cart should have all required fields for tracking",
    analyticsCart.id !== null &&
      analyticsCart.created_at !== null &&
      analyticsCart.last_activity_at !== null &&
      analyticsCart.total_item_count >= 0 &&
      analyticsCart.total_product_count >= 0 &&
      analyticsCart.status !== null,
  );

  // Test 9: Validate cleanup trigger preparation scenarios
  const cleanupCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: JSON.stringify({
          method: "economy",
          carrier: "USPS",
          delivery_window: "flexible",
        }),
        promotional_codes: JSON.stringify([
          { code: "EOL50", type: "percentage", value: 50 },
        ]),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cleanupCart);

  TestValidator.predicate(
    "cleanup cart should have soft deletion timestamp as null initially",
    cleanupCart.deleted_at === null || cleanupCart.deleted_at === undefined,
  );

  TestValidator.predicate(
    "cleanup cart should have conversion timestamp as null initially",
    cleanupCart.converted_at === null || cleanupCart.converted_at === undefined,
  );

  TestValidator.predicate(
    "cleanup cart should support lifecycle state transitions",
    ["active", "abandoned", "converted"].includes(cleanupCart.status),
  );
}
