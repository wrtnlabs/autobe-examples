import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation for authenticated customers.
 *
 * This test validates that customers can successfully initialize new shopping
 * sessions with appropriate default configuration. The test covers minimal cart
 * creation scenarios focusing on proper status initialization, counter
 * management, and response validation.
 *
 * Test workflow:
 *
 * 1. Create basic cart with minimal configuration
 * 2. Verify response structure and type safety
 * 3. Validate cart status and lifecycle properties
 * 4. Test numeric counter validation
 * 5. Verify timestamp format compliance
 * 6. Test boolean property validation (checkout lock)
 */
export async function test_api_cart_creation_customer(
  connection: api.IConnection,
) {
  // Create minimal cart with basic configuration
  const basicCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {} satisfies IShoppingMallCart.ICreate,
  });

  // Validate response type safety (single call validates all properties)
  typia.assert(basicCart);

  // Verify cart initialization properties
  TestValidator.equals(
    "basic cart status initialization",
    basicCart.status,
    "active",
  );
  TestValidator.equals(
    "basic cart item count initialization",
    basicCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "basic cart product count initialization",
    basicCart.total_product_count,
    0,
  );
  TestValidator.equals(
    "basic cart checkout lock",
    basicCart.is_locked_for_checkout,
    false,
  );
  TestValidator.predicate(
    "basic cart converted_at is null",
    basicCart.converted_at === null,
  );
  TestValidator.predicate(
    "basic cart deleted_at is null",
    basicCart.deleted_at === null,
  );

  // Test optional configuration properties with proper pre-formatted JSON
  const promotional_codes = `[
    "${RandomGenerator.alphaNumeric(8)}",
    "${RandomGenerator.alphaNumeric(8)}",
    "${RandomGenerator.alphaNumeric(8)}"
  ]`;
  const customer_notes = RandomGenerator.paragraph({ sentences: 3 });
  const customer_shipping_preference = `{
    "method": "${RandomGenerator.pick(["standard", "expedited", "express"])}",
    "carrier": "${RandomGenerator.pick(["fedex", "ups", "usps", "dhl"])}",
    "delivery_window": "${RandomGenerator.pick(["morning", "afternoon", "evening"])}"
  }`;

  // Create cart with optional configuration
  const configuredCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes,
        customer_notes,
        customer_shipping_preference,
      } satisfies IShoppingMallCart.ICreate,
    },
  );

  // Validate configured cart response (single type validation)
  typia.assert(configuredCart);
  TestValidator.equals(
    "configured cart promotional codes",
    configuredCart.promotional_codes,
    promotional_codes,
  );
  TestValidator.equals(
    "configured cart customer notes",
    configuredCart.customer_notes,
    customer_notes,
  );
  TestValidator.equals(
    "configured cart shipping preference",
    configuredCart.customer_shipping_preference,
    customer_shipping_preference,
  );

  // Test cart identifier validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "basic cart UUID format",
    uuidRegex.test(basicCart.id),
  );
  TestValidator.predicate(
    "configured cart UUID format",
    uuidRegex.test(configuredCart.id),
  );

  // Test cart uniqueness
  TestValidator.notEquals(
    "cart IDs are unique",
    basicCart.id,
    configuredCart.id,
  );

  // Test numeric type validation for counters
  TestValidator.predicate(
    "basic cart total_item_count is int32",
    typeof basicCart.total_item_count === "number" &&
      basicCart.total_item_count >= 0,
  );
  TestValidator.predicate(
    "basic cart total_product_count is int32",
    typeof basicCart.total_product_count === "number" &&
      basicCart.total_product_count >= 0,
  );
  TestValidator.predicate(
    "configured cart total_item_count is int32",
    typeof configuredCart.total_item_count === "number" &&
      configuredCart.total_item_count >= 0,
  );
  TestValidator.predicate(
    "configured cart total_product_count is int32",
    typeof configuredCart.total_product_count === "number" &&
      configuredCart.total_product_count >= 0,
  );

  // Test boolean validation for checkout lock
  TestValidator.predicate(
    "basic cart is_locked_for_checkout is boolean",
    typeof basicCart.is_locked_for_checkout === "boolean",
  );
  TestValidator.predicate(
    "configured cart is_locked_for_checkout is boolean",
    typeof configuredCart.is_locked_for_checkout === "boolean",
  );

  // Test timestamp format validation (ISO 8601)
  const isoDateTimeRegex =
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/;
  TestValidator.predicate(
    "basic cart created_at format",
    isoDateTimeRegex.test(basicCart.created_at),
  );
  TestValidator.predicate(
    "basic cart updated_at format",
    isoDateTimeRegex.test(basicCart.updated_at),
  );
  TestValidator.predicate(
    "basic cart last_activity_at format",
    isoDateTimeRegex.test(basicCart.last_activity_at),
  );
  TestValidator.predicate(
    "configured cart created_at format",
    isoDateTimeRegex.test(configuredCart.created_at),
  );
  TestValidator.predicate(
    "configured cart updated_at format",
    isoDateTimeRegex.test(configuredCart.updated_at),
  );
  TestValidator.predicate(
    "configured cart last_activity_at format",
    isoDateTimeRegex.test(configuredCart.last_activity_at),
  );

  // Test optional timestamp fields (may be null for new carts)
  if (basicCart.expires_at) {
    TestValidator.predicate(
      "basic cart expires_at format",
      isoDateTimeRegex.test(basicCart.expires_at),
    );
  }
  if (configuredCart.expires_at) {
    TestValidator.predicate(
      "configured cart expires_at format",
      isoDateTimeRegex.test(configuredCart.expires_at),
    );
  }
  if (basicCart.converted_at) {
    TestValidator.predicate(
      "basic cart converted_at format",
      isoDateTimeRegex.test(basicCart.converted_at),
    );
  }
  if (configuredCart.converted_at) {
    TestValidator.predicate(
      "configured cart converted_at format",
      isoDateTimeRegex.test(configuredCart.converted_at),
    );
  }
  if (basicCart.deleted_at) {
    TestValidator.predicate(
      "basic cart deleted_at format",
      isoDateTimeRegex.test(basicCart.deleted_at),
    );
  }
  if (configuredCart.deleted_at) {
    TestValidator.predicate(
      "configured cart deleted_at format",
      isoDateTimeRegex.test(configuredCart.deleted_at),
    );
  }
}
