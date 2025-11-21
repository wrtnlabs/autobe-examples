import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test cart creation business rule validation including promotional code
 * eligibility validation, minimum order requirements checking, seller
 * participation verification, and marketplace-wide rule application during cart
 * initialization. Validate proper business logic enforcement and meaningful
 * customer feedback when business rule violations occur during cart creation
 * workflow.
 *
 * This test validates the comprehensive cart creation process with business
 * rule enforcement:
 *
 * 1. Create basic cart with minimal configuration to ensure proper initialization
 * 2. Test cart creation with valid promotional codes and verify proper validation
 * 3. Test cart creation with customer shipping preferences and validate
 *    configuration
 * 4. Test cart creation with customer notes and verify proper handling
 * 5. Verify business rule validation during cart initialization
 * 6. Test error handling scenarios for invalid promotional codes
 * 7. Test error handling for unsupported shipping preferences
 * 8. Validate proper response formatting and business rule compliance
 *
 * The test ensures that marketplace-wide rules are properly applied during cart
 * creation and that customers receive meaningful feedback when business rule
 * violations occur.
 */
export async function test_api_cart_creation_business_rule_validation(
  connection: api.IConnection,
) {
  // Create basic cart with minimal configuration
  const basicCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {},
  });
  typia.assert(basicCart);

  TestValidator.equals("basic cart status", basicCart.status, "active");
  TestValidator.equals("basic cart item count", basicCart.total_item_count, 0);
  TestValidator.equals(
    "basic cart product count",
    basicCart.total_product_count,
    0,
  );
  TestValidator.equals(
    "basic cart locked for checkout",
    basicCart.is_locked_for_checkout,
    false,
  );

  // Test cart creation with promotional codes
  const cartWithPromotions = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes: JSON.stringify({
          codes: ["SAVE15", "FREESHIP"],
          validation_status: "pending",
        }),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithPromotions);

  TestValidator.equals(
    "cart with promotions status",
    cartWithPromotions.status,
    "active",
  );
  TestValidator.predicate(
    "cart with promotions promotional codes",
    cartWithPromotions.promotional_codes !== undefined,
  );

  // Test cart creation with shipping preferences
  const cartWithShipping = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: JSON.stringify({
          preferred_carrier: "UPS",
          delivery_speed: "express",
          requires_signature: true,
        }),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithShipping);

  TestValidator.equals(
    "cart with shipping status",
    cartWithShipping.status,
    "active",
  );
  TestValidator.predicate(
    "cart with shipping preferences",
    cartWithShipping.customer_shipping_preference !== undefined,
  );

  // Test cart creation with customer notes
  const notesContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const cartWithNotes = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes: notesContent,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithNotes);

  TestValidator.equals(
    "cart with notes status",
    cartWithNotes.status,
    "active",
  );
  TestValidator.equals(
    "cart with notes content",
    cartWithNotes.customer_notes,
    notesContent,
  );

  // Test cart creation with comprehensive configuration
  const comprehensiveCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes: JSON.stringify({
          codes: ["WELCOME10", "STUDENT5"],
          validation_status: "valid",
          discounts: [
            { code: "WELCOME10", amount: 10, type: "percentage" },
            { code: "STUDENT5", amount: 5, type: "fixed" },
          ],
        }),
        customer_shipping_preference: JSON.stringify({
          preferred_carrier: "FedEx",
          delivery_speed: "standard",
          requires_signature: false,
          special_instructions: "Leave at front door",
        }),
        customer_notes: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(comprehensiveCart);

  TestValidator.equals(
    "comprehensive cart status",
    comprehensiveCart.status,
    "active",
  );
  TestValidator.notEquals(
    "comprehensive cart promotional codes",
    comprehensiveCart.promotional_codes,
    undefined,
  );
  TestValidator.notEquals(
    "comprehensive cart shipping preference",
    comprehensiveCart.customer_shipping_preference,
    undefined,
  );
  TestValidator.notEquals(
    "comprehensive cart customer notes",
    comprehensiveCart.customer_notes,
    undefined,
  );

  // Test error scenarios for business rule validation

  // Test with invalid promotional code structure
  await TestValidator.error(
    "invalid promotional code structure should fail",
    async () => {
      await api.functional.shoppingMall.carts.create(connection, {
        body: {
          promotional_codes: "invalid-code-format", // Not a valid JSON structure
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Test with invalid shipping preference format
  await TestValidator.error(
    "invalid shipping preference format should fail",
    async () => {
      await api.functional.shoppingMall.carts.create(connection, {
        body: {
          customer_shipping_preference: "not-json", // Not a valid JSON structure
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Test with empty promotional codes array
  const emptyCodesCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        promotional_codes: JSON.stringify({ codes: [] }),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(emptyCodesCart);
  TestValidator.equals(
    "empty codes cart status",
    emptyCodesCart.status,
    "active",
  );

  // Test with maximum length customer notes (assuming 1000 character limit based on DTO description)
  const maxNotesCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes: ArrayUtil.repeat(50, () =>
          RandomGenerator.name(2),
        ).join(" "), // Approximately 1000 characters
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(maxNotesCart);
  TestValidator.equals("max notes cart status", maxNotesCart.status, "active");
  TestValidator.predicate(
    "max notes character count",
    maxNotesCart.customer_notes!.length <= 1000,
  );

  // Validate business rule compliance across all created carts
  const createdCarts = [
    basicCart,
    cartWithPromotions,
    cartWithShipping,
    cartWithNotes,
    comprehensiveCart,
    emptyCodesCart,
    maxNotesCart,
  ];

  for (const cart of createdCarts) {
    // Verify all carts have required properties
    TestValidator.predicate(
      `cart ${cart.id} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cart.id,
      ),
    );
    TestValidator.predicate(
      `cart ${cart.id} has non-negative item count`,
      cart.total_item_count >= 0,
    );
    TestValidator.predicate(
      `cart ${cart.id} has non-negative product count`,
      cart.total_product_count >= 0,
    );
    TestValidator.predicate(
      `cart ${cart.id} has valid status`,
      cart.status === "active",
    );
    TestValidator.predicate(
      `cart ${cart.id} has proper timestamp format`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        cart.created_at,
      ),
    );
    TestValidator.predicate(
      `cart ${cart.id} has proper timestamp format`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        cart.updated_at,
      ),
    );
    TestValidator.predicate(
      `cart ${cart.id} has proper timestamp format`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        cart.last_activity_at,
      ),
    );

    // Verify business rule enforcement
    TestValidator.equals(
      `cart ${cart.id} is not locked for new carts`,
      cart.is_locked_for_checkout,
      false,
    );
    TestValidator.equals(
      `cart ${cart.id} is not converted`,
      cart.converted_at,
      null,
    );
    TestValidator.predicate(
      `cart ${cart.id} has valid expires at`,
      cart.expires_at === null ||
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          cart.expires_at!,
        ),
    );
  }
}
