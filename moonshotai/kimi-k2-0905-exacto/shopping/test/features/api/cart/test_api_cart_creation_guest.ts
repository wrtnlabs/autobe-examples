import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation for guest users
 *
 * This test validates the complete guest cart creation workflow including:
 *
 * - Anonymous shopping session initialization
 * - Default cart configuration validation
 * - Shipping preference handling
 * - Promotional code application
 * - Customer notes functionality
 * - Cart expiration management
 * - Session isolation between multiple guest carts
 * - Cart status and locking behavior
 */
export async function test_api_cart_creation_guest(
  connection: api.IConnection,
) {
  // Step 1: Create basic guest cart with minimal configuration
  const basicGuestCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(basicGuestCart);

  // Validate basic cart properties
  TestValidator.predicate(
    "basic cart should have zero items",
    basicGuestCart.total_item_count === 0,
  );
  TestValidator.predicate(
    "basic cart should have zero products",
    basicGuestCart.total_product_count === 0,
  );
  TestValidator.equals(
    "basic cart should have active status",
    basicGuestCart.status,
    "active",
  );
  TestValidator.predicate(
    "basic cart should not be locked for checkout",
    basicGuestCart.is_locked_for_checkout === false,
  );
  TestValidator.predicate(
    "basic cart should not be converted",
    basicGuestCart.converted_at === null,
  );

  // Step 2: Test cart creation with shipping preferences
  const shippingPreference = JSON.stringify({
    carrier: "UPS",
    speed: "standard",
    instructions: "Leave at front door",
  });

  const cartWithShipping = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: shippingPreference,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithShipping);

  TestValidator.equals(
    "cart with shipping should preserve preference",
    cartWithShipping.customer_shipping_preference,
    shippingPreference,
  );

  // Step 3: Test cart creation with promotional codes
  const promotionalCodes = JSON.stringify([
    { code: "SAVE10", discount: 10, type: "percentage" },
    { code: "FREESHIP", discount: 0, type: "free_shipping" },
  ]);

  const cartWithPromotions = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes: promotionalCodes,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithPromotions);

  TestValidator.equals(
    "cart with promotions should preserve codes",
    cartWithPromotions.promotional_codes,
    promotionalCodes,
  );

  // Step 4: Test cart creation with customer notes
  const customerNotes =
    "Please include gift receipt and wrap items separately for gift giving.";

  const cartWithNotes = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes: customerNotes,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithNotes);

  TestValidator.equals(
    "cart with notes should preserve customer notes",
    cartWithNotes.customer_notes,
    customerNotes,
  );

  // Step 5: Test cart creation with combined configuration
  const combinedConfiguration = {
    customer_shipping_preference: shippingPreference,
    promotional_codes: promotionalCodes,
    customer_notes: customerNotes,
  } satisfies IShoppingMallCart.ICreate;

  const cartWithAllOptions = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: combinedConfiguration,
    },
  );
  typia.assert(cartWithAllOptions);

  TestValidator.equals(
    "combined cart should preserve shipping preference",
    cartWithAllOptions.customer_shipping_preference,
    shippingPreference,
  );
  TestValidator.equals(
    "combined cart should preserve promotional codes",
    cartWithAllOptions.promotional_codes,
    promotionalCodes,
  );
  TestValidator.equals(
    "combined cart should preserve customer notes",
    cartWithAllOptions.customer_notes,
    customerNotes,
  );

  // Step 6: Validate cart expiration behavior
  const currentTime = new Date();
  TestValidator.predicate(
    "cart should have creation timestamp",
    new Date(cartWithAllOptions.created_at) <= currentTime,
  );
  TestValidator.predicate(
    "cart should have last activity timestamp",
    new Date(cartWithAllOptions.last_activity_at) <= currentTime,
  );
  TestValidator.predicate(
    "cart should have update timestamp",
    new Date(cartWithAllOptions.updated_at) <= currentTime,
  );

  // Validate that timestamps are reasonable (within last minute)
  const oneMinuteAgo = new Date(Date.now() - 60000);
  TestValidator.predicate(
    "cart creation should be recent",
    new Date(cartWithAllOptions.created_at) >= oneMinuteAgo,
  );

  // Step 7: Test multiple cart sessions to ensure isolation
  const guestCart1 = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes: "Guest cart 1",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(guestCart1);

  const guestCart2 = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes: "Guest cart 2",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(guestCart2);

  TestValidator.notEquals(
    "multiple guest carts should have different IDs",
    guestCart1.id,
    guestCart2.id,
  );

  TestValidator.equals(
    "guest cart 1 should have correct notes",
    guestCart1.customer_notes,
    "Guest cart 1",
  );

  TestValidator.equals(
    "guest cart 2 should have correct notes",
    guestCart2.customer_notes,
    "Guest cart 2",
  );
}
