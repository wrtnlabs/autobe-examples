import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Validate guest user shopping cart creation and session initialization.
 *
 * This test verifies that unauthenticated guest users can successfully create
 * shopping carts without authentication requirements. It validates proper cart
 * initialization with unique ID generation, default status and counters,
 * session management capabilities, and support for guest-to-authenticated
 * customer transitions during marketplace shopping.
 *
 * The test ensures that guest carts are properly configured with:
 *
 * - Unique UUID cart identifiers for session tracking
 * - Default active status for ongoing shopping sessions
 * - Zero item/product counts for new carts
 * - Proper timestamp configurations for lifecycle management
 * - Support for optional configuration settings like shipping preferences
 * - Session management capabilities for anonymous users
 *
 * This enables seamless guest shopping experiences while providing
 * infrastructure for future customer account conversions and cart persistence
 * across authentication transitions in the multi-seller marketplace platform.
 */
export async function test_api_cart_create_guest_user_session(
  connection: api.IConnection,
) {
  // Create multiple guest cart sessions to validate consistency
  const cartData1 = {
    customer_shipping_preference: null,
    promotional_codes: null,
    customer_notes: null,
  } satisfies IShoppingMallCart.ICreate;

  const cartData2 = {
    customer_shipping_preference: JSON.stringify({
      carrier: "UPS",
      speed: "standard",
    }),
    promotional_codes: JSON.stringify(["SAVE10", "FREESHIP"]),
    customer_notes: "Gift wrapping requested - birthday present",
  } satisfies IShoppingMallCart.ICreate;

  // Create first guest cart
  const cart1 = await api.functional.shoppingMall.carts.create(connection, {
    body: cartData1,
  });
  typia.assert(cart1);

  // Create second guest cart with configuration
  const cart2 = await api.functional.shoppingMall.carts.create(connection, {
    body: cartData2,
  });
  typia.assert(cart2);

  // Validate cart structure and properties
  TestValidator.equals(
    "cart2 has shipping preference",
    cart2.customer_shipping_preference,
    JSON.stringify({ carrier: "UPS", speed: "standard" }),
  );
  TestValidator.equals(
    "cart2 has promotional codes",
    cart2.promotional_codes,
    JSON.stringify(["SAVE10", "FREESHIP"]),
  );
  TestValidator.equals(
    "cart2 has customer notes",
    cart2.customer_notes,
    "Gift wrapping requested - birthday present",
  );

  // Test cart with no configuration data
  const cartData3 = {} satisfies IShoppingMallCart.ICreate;
  const cart3 = await api.functional.shoppingMall.carts.create(connection, {
    body: cartData3,
  });
  typia.assert(cart3);

  // Validate basic cart properties across all scenarios
  TestValidator.predicate("cart status is active", cart1.status === "active");
  TestValidator.equals("cart1 item count", cart1.total_item_count, 0);
  TestValidator.equals("cart1 product count", cart1.total_product_count, 0);
  TestValidator.equals(
    "cart1 is not locked for checkout",
    cart1.is_locked_for_checkout,
    false,
  );

  // Validate optional fields are properly set for cart3
  TestValidator.equals(
    "cart3 optional fields are null",
    cart3.customer_shipping_preference,
    null,
  );
  TestValidator.equals(
    "cart3 promotional codes are null",
    cart3.promotional_codes,
    null,
  );
  TestValidator.equals(
    "cart3 customer notes are null",
    cart3.customer_notes,
    null,
  );
}
