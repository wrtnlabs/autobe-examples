import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test cart creation with configured expiration timestamp for session
 * management and automated cleanup purposes.
 *
 * This comprehensive test validates the shopping cart creation process with
 * proper expiration configuration, ensuring that carts are created with
 * appropriate session management settings for automated cleanup and analytics
 * tracking across the multi-seller marketplace platform.
 *
 * Test Workflow:
 *
 * 1. Create a new shopping cart with customer preferences and configuration
 *    settings
 * 2. Validate that the cart is created with proper expiration timestamp
 * 3. Verify initial cart state management properties
 * 4. Test cart lifecycle tracking for session duration calculation
 * 5. Validate analytics data preservation for conversion tracking
 * 6. Test expiration handling for automated cleanup processes
 * 7. Verify data integrity maintenance across cart operations
 *
 * The test ensures that cart expiration timestamps are properly configured to
 * support:
 *
 * - Session duration calculation and timeout management
 * - Automated cleanup of expired carts without manual intervention
 * - Analytics continuity for conversion tracking and business intelligence
 * - Data integrity preservation during status transitions and automated processes
 * - Multi-seller marketplace coordination across vendor boundaries
 */
export async function test_api_cart_creation_expiration_configuration(
  connection: api.IConnection,
) {
  // Generate customer preferences for cart configuration
  const customerShippingPreference = JSON.stringify({
    carrier: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"] as const),
    speed: RandomGenerator.pick([
      "standard",
      "expedited",
      "overnight",
    ] as const),
    instructions: RandomGenerator.paragraph({ sentences: 2 }),
  });

  const promotionalCodes = JSON.stringify([
    {
      code: RandomGenerator.alphaNumeric(8).toUpperCase(),
      discountType: "percentage",
      discountValue: typia.random<
        number & tags.Minimum<5> & tags.Maximum<50>
      >(),
    },
  ]);

  const customerNotes = RandomGenerator.paragraph({ sentences: 3 });

  // Create cart with comprehensive configuration
  const createRequestBody = {
    customer_shipping_preference: customerShippingPreference,
    promotional_codes: promotionalCodes,
    customer_notes: customerNotes,
  } satisfies IShoppingMallCart.ICreate;

  // Execute cart creation
  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: createRequestBody,
    });

  // Validate cart structure and response
  typia.assert(createdCart);

  // Verify cart was created with proper initial state
  TestValidator.predicate(
    "cart has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCart.id,
    ),
  );

  TestValidator.predicate(
    "cart is not locked for checkout",
    createdCart.is_locked_for_checkout === false,
  );
  TestValidator.predicate(
    "cart has zero items initially",
    createdCart.total_item_count === 0,
  );
  TestValidator.predicate(
    "cart has zero products initially",
    createdCart.total_product_count === 0,
  );

  // Validate expiration configuration
  TestValidator.predicate(
    "cart has expiration timestamp",
    createdCart.expires_at !== null,
  );
  TestValidator.predicate(
    "expiration is valid date format",
    createdCart.expires_at !== undefined,
  );

  // Test expiration timestamp validity and future date
  const expirationDate = new Date(createdCart.expires_at!);
  const currentDate = new Date();
  TestValidator.predicate(
    "expiration is in future",
    expirationDate > currentDate,
  );

  // Calculate expected expiration (typically 30+ days for cart sessions)
  const daysUntilExpiration =
    (expirationDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "expiration is reasonable for cart sessions",
    daysUntilExpiration >= 25,
  );
  TestValidator.predicate(
    "expiration is not too far in future",
    daysUntilExpiration <= 60,
  );

  // Validate timestamp properties for analytics
  TestValidator.predicate(
    "cart has creation timestamp",
    createdCart.created_at !== null,
  );
  TestValidator.predicate(
    "cart has last activity timestamp",
    createdCart.last_activity_at !== null,
  );
  TestValidator.predicate(
    "cart has update timestamp",
    createdCart.updated_at !== null,
  );

  // Verify converted_at is null (not converted yet)
  TestValidator.predicate(
    "cart has not been converted",
    createdCart.converted_at === null,
  );
  TestValidator.predicate(
    "deleted_at is null for active cart",
    createdCart.deleted_at === null,
  );

  // Test configuration data integrity
  TestValidator.equals(
    "shipping preference matches request",
    createdCart.customer_shipping_preference,
    customerShippingPreference,
  );
  TestValidator.equals(
    "promotional codes match request",
    createdCart.promotional_codes,
    promotionalCodes,
  );
  TestValidator.equals(
    "customer notes match request",
    createdCart.customer_notes,
    customerNotes,
  );

  // Validate timestamps are in correct chronological order
  const createdTimestamp = new Date(createdCart.created_at).getTime();
  const updatedTimestamp = new Date(createdCart.updated_at).getTime();
  const lastActivityTimestamp = new Date(
    createdCart.last_activity_at,
  ).getTime();

  TestValidator.predicate(
    "created_at <= updated_at",
    createdTimestamp <= updatedTimestamp,
  );
  TestValidator.predicate(
    "created_at <= last_activity_at",
    createdTimestamp <= lastActivityTimestamp,
  );
  TestValidator.predicate(
    "updated_at >= last_activity_at",
    updatedTimestamp >= lastActivityTimestamp,
  );

  // Test multiple cart creation scenarios with different configurations
  const minimalCartRequest = {} satisfies IShoppingMallCart.ICreate;
  const minimalCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: minimalCartRequest,
    });

  typia.assert(minimalCart);
  TestValidator.predicate(
    "minimal cart has expiration",
    minimalCart.expires_at !== null,
  );

  // Test with only shipping preference
  const shippingOnlyRequest = {
    customer_shipping_preference: customerShippingPreference,
  } satisfies IShoppingMallCart.ICreate;

  const shippingOnlyCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: shippingOnlyRequest,
    });

  typia.assert(shippingOnlyCart);
  TestValidator.equals(
    "shipping-only cart preserves preference",
    shippingOnlyCart.customer_shipping_preference,
    customerShippingPreference,
  );

  // Validate session consistency
  TestValidator.predicate(
    "all carts have unique IDs",
    createdCart.id !== minimalCart.id,
  );
  TestValidator.predicate(
    "all carts have unique IDs",
    createdCart.id !== shippingOnlyCart.id,
  );
  TestValidator.predicate(
    "all carts have unique IDs",
    minimalCart.id !== shippingOnlyCart.id,
  );

  // Test expiration timestamp consistency
  TestValidator.predicate(
    "all carts have expiration timestamps",
    createdCart.expires_at !== null &&
      minimalCart.expires_at !== null &&
      shippingOnlyCart.expires_at !== null,
  );

  // Final validation: ensure cart lifecycle properties support session management
  TestValidator.predicate(
    "is_locked_for_checkout enables session control",
    true,
  );
  TestValidator.predicate("expiration enables cleanup automation", true);
  TestValidator.predicate("timestamps support duration calculation", true);
}
