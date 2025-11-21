import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test successful shopping cart creation for anonymous guest users.
 *
 * This test validates the complete guest shopping cart creation workflow where
 * unauthenticated users can initialize new shopping sessions. The test ensures
 * proper initialization of cart properties including unique identifier
 * generation, default counters set to zero, active status assignment, checkout
 * locking state, and proper timestamp management for session tracking.
 *
 * The test covers:
 *
 * 1. Guest cart creation without authentication requirements
 * 2. Proper initialization of cart counters (total_item_count,
 *    total_product_count)
 * 3. Default status and configuration settings
 * 4. Timestamp and lifecycle management
 * 5. Optional properties handling (customer notes, promotional codes, shipping
 *    preferences)
 * 6. Response validation using typia
 * 7. Business logic validation of cart state initialization
 *
 * @param connection - API connection for cart operations
 */
export async function test_api_guest_shopping_cart_creation(
  connection: api.IConnection,
) {
  // Create cart input with random configuration
  const cartInput = {
    customer_notes: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 8,
    }),
    promotional_codes: JSON.stringify([
      {
        code: "WELCOME10",
        discount: 10,
        type: "percentage",
      },
    ]),
    customer_shipping_preference: JSON.stringify({
      carrier: "UPS",
      speed: "standard",
      signature_required: false,
    }),
  } satisfies IShoppingMallCart.ICreate;

  // Call the cart creation API - must have await
  const guestCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: cartInput,
    });

  // Validate response type and structure
  typia.assert(guestCart);

  // Validate cart ID is proper UUID format
  TestValidator.predicate(
    "cart UUID format validation",
    guestCart.id.length === 36 && guestCart.id.includes("-"),
  );

  // Validate initial cart state - use specific validation not broad regex
  TestValidator.equals(
    "cart initialized with zero items",
    guestCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "cart initialized with zero products",
    guestCart.total_product_count,
    0,
  );
  TestValidator.predicate(
    "cart status is active",
    guestCart.status === "active",
  );
  TestValidator.equals(
    "checkout lock state",
    guestCart.is_locked_for_checkout,
    false,
  );
  TestValidator.equals(
    "conversion timestamp null",
    guestCart.converted_at,
    null,
  );

  // Validate timestamp formats using type system
  const timestampValidation =
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guestCart.created_at) &&
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guestCart.updated_at) &&
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guestCart.last_activity_at);
  TestValidator.predicate(
    "all timestamps have valid ISO format",
    timestampValidation,
  );

  // Validate optional properties
  TestValidator.equals(
    "customer notes preserved",
    typia.assert<string>(guestCart.customer_notes),
    typia.assert<string>(cartInput.customer_notes),
  );
  TestValidator.equals(
    "promotional codes preserved",
    guestCart.promotional_codes,
    cartInput.promotional_codes,
  );
  TestValidator.equals(
    "shipping preference preserved",
    guestCart.customer_shipping_preference,
    cartInput.customer_shipping_preference,
  );

  // Validate lifecycle state
  TestValidator.equals("deleted_at is null", guestCart.deleted_at, null);
  TestValidator.predicate(
    "expires_at handling",
    guestCart.expires_at === null || !!guestCart.expires_at,
  );
}
