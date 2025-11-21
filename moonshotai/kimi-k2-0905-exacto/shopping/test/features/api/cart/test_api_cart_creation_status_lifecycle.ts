import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation and status lifecycle validation
 *
 * Validates comprehensive cart creation functionality including:
 *
 * 1. Cart initialization with proper default values
 * 2. Status management ('active' for new carts)
 * 3. Item counting accuracy (total_item_count, total_product_count)
 * 4. Timestamp field validation (created_at, updated_at, last_activity_at)
 * 5. Conversion timestamp null verification for new carts
 * 6. Checkout lock status initialization
 * 7. Optional configuration parameter handling
 *
 * The test ensures carts are properly configured for multi-seller marketplace
 * operations with appropriate lifecycle management settings.
 */
export async function test_api_cart_creation_status_lifecycle(
  connection: api.IConnection,
) {
  // Create basic cart with minimal configuration
  const basicCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {} satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(basicCart);

  // Validate basic cart properties
  TestValidator.equals("basic cart status", basicCart.status, "active");
  TestValidator.equals("basic cart item count", basicCart.total_item_count, 0);
  TestValidator.equals(
    "basic cart product count",
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
    basicCart.converted_at === null || basicCart.converted_at === undefined,
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "basic cart created_at is valid",
    typia.is<string & tags.Format<"date-time">>(basicCart.created_at),
  );
  TestValidator.predicate(
    "basic cart updated_at is valid",
    typia.is<string & tags.Format<"date-time">>(basicCart.updated_at),
  );
  TestValidator.predicate(
    "basic cart last_activity_at is valid",
    typia.is<string & tags.Format<"date-time">>(basicCart.last_activity_at),
  );
  TestValidator.equals(
    "basic cart timestamps match",
    basicCart.created_at,
    basicCart.updated_at,
  );
  TestValidator.equals(
    "basic cart activity timestamp matches",
    basicCart.updated_at,
    basicCart.last_activity_at,
  );

  // Create cart with optional configuration
  const shippingPreference = JSON.stringify({
    method: "standard",
    carrier: "UPS",
    delivery_speed: "ground",
  });

  const promotionalCodes = JSON.stringify([
    { code: "SAVE10", discount: 0.1, type: "percentage" },
    { code: "FREESHIP", discount: 5.0, type: "fixed" },
  ]);

  const customerNotesText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const configuredCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: shippingPreference,
        promotional_codes: promotionalCodes,
        customer_notes: customerNotesText,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(configuredCart);

  // Validate configured cart properties
  TestValidator.equals(
    "configured cart status",
    configuredCart.status,
    "active",
  );
  TestValidator.equals(
    "configured cart item count",
    configuredCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "configured cart product count",
    configuredCart.total_product_count,
    0,
  );
  TestValidator.equals(
    "configured cart checkout lock",
    configuredCart.is_locked_for_checkout,
    false,
  );
  TestValidator.predicate(
    "configured cart converted_at is null",
    configuredCart.converted_at === null ||
      configuredCart.converted_at === undefined,
  );

  // Validate optional configuration fields
  TestValidator.equals(
    "configured cart shipping preference",
    configuredCart.customer_shipping_preference,
    shippingPreference,
  );
  TestValidator.equals(
    "configured cart promotional codes",
    configuredCart.promotional_codes,
    promotionalCodes,
  );
  TestValidator.equals(
    "configured cart customer notes",
    configuredCart.customer_notes,
    customerNotesText,
  );

  // Validate timestamps for configured cart
  TestValidator.predicate(
    "configured cart created_at is valid",
    typia.is<string & tags.Format<"date-time">>(configuredCart.created_at),
  );
  TestValidator.predicate(
    "configured cart updated_at is valid",
    typia.is<string & tags.Format<"date-time">>(configuredCart.updated_at),
  );
  TestValidator.predicate(
    "configured cart last_activity_at is valid",
    typia.is<string & tags.Format<"date-time">>(
      configuredCart.last_activity_at,
    ),
  );

  // Test partial configuration scenarios
  const partialShippingPreference = JSON.stringify({
    method: "express",
  });

  const customNotesOnlyCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: partialShippingPreference,
        customer_notes: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(customNotesOnlyCart);

  TestValidator.equals(
    "custom notes cart status",
    customNotesOnlyCart.status,
    "active",
  );
  TestValidator.equals(
    "custom notes cart item count",
    customNotesOnlyCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "custom notes cart shipping preference",
    customNotesOnlyCart.customer_shipping_preference,
    partialShippingPreference,
  );
  TestValidator.predicate(
    "custom notes cart promotional codes is null",
    customNotesOnlyCart.promotional_codes === null ||
      customNotesOnlyCart.promotional_codes === undefined,
  );

  // Test with different configuration combinations
  const codesOnlyCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes: JSON.stringify([
          { code: "WELCOME20", discount: 0.2 },
        ]),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(codesOnlyCart);

  TestValidator.equals(
    "codes only cart status",
    codesOnlyCart.status,
    "active",
  );
  TestValidator.predicate(
    "codes only cart customer shipping preference is null",
    codesOnlyCart.customer_shipping_preference === null ||
      codesOnlyCart.customer_shipping_preference === undefined,
  );
  TestValidator.predicate(
    "codes only cart customer notes is null",
    codesOnlyCart.customer_notes === null ||
      codesOnlyCart.customer_notes === undefined,
  );

  // Test with null/undefined optional fields
  const minimalistCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: null,
        promotional_codes: undefined,
        customer_notes: null,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(minimalistCart);

  TestValidator.equals(
    "minimalist cart status",
    minimalistCart.status,
    "active",
  );
  TestValidator.predicate(
    "minimalist cart customer shipping preference is null",
    minimalistCart.customer_shipping_preference === null ||
      minimalistCart.customer_shipping_preference === undefined,
  );
  TestValidator.predicate(
    "minimalist cart promotional codes is null",
    minimalistCart.promotional_codes === null ||
      minimalistCart.promotional_codes === undefined,
  );
  TestValidator.predicate(
    "minimalist cart customer notes is null",
    minimalistCart.customer_notes === null ||
      minimalistCart.customer_notes === undefined,
  );
}
