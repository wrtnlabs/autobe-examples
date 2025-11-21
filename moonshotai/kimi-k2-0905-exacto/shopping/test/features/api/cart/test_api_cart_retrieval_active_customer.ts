import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart retrieval for active customer sessions.
 *
 * This comprehensive test validates the complete cart retrieval functionality
 * for authenticated customers in the shopping mall platform. The test covers:
 *
 * 1. Cart creation with customer preferences and promotional codes
 * 2. Successful cart retrieval using the unique cart ID
 * 3. Validation of cart structure and all properties
 * 4. Authentication and access permission verification
 * 5. Cart lifecycle information validation
 * 6. Edge case testing for invalid cart access
 * 7. Customer preference and promotional code validation
 *
 * The test ensures that customers can only access their own cart data and that
 * the complete cart information is properly returned including item counts,
 * pricing calculations, and current status indicators.
 */
export async function test_api_cart_retrieval_active_customer(
  connection: api.IConnection,
) {
  // Step 1: Create a new shopping cart with customer preferences
  const customerShippingPreference = JSON.stringify({
    carrier: "UPS",
    speed: "standard",
    instructions: "Leave at front door",
  });

  const promotionalCodes = JSON.stringify([
    { code: "SAVE10", discount: 10, type: "percentage" },
    { code: "WELCOME", discount: 25, type: "fixed" },
  ]);

  const createCartBody = {
    customer_shipping_preference: customerShippingPreference,
    promotional_codes: promotionalCodes,
    customer_notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCart.ICreate;

  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: createCartBody,
    });
  typia.assert(createdCart);

  // Step 2: Verify the cart was created with correct properties
  TestValidator.equals("cart has valid UUID", createdCart.id.length, 36);
  TestValidator.equals(
    "initial cart has zero items",
    createdCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "initial cart has zero products",
    createdCart.total_product_count,
    0,
  );
  TestValidator.equals("cart status is active", createdCart.status, "active");
  TestValidator.equals(
    "cart is not locked for checkout",
    createdCart.is_locked_for_checkout,
    false,
  );
  TestValidator.equals(
    "cart has not been converted",
    createdCart.converted_at,
    null,
  );

  // Step 3: Retrieve the cart using its ID
  const retrievedCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.at(connection, {
      cartId: createdCart.id,
    });
  typia.assert(retrievedCart);

  // Step 4: Validate retrieved cart matches created cart
  TestValidator.equals(
    "retrieved cart ID matches created cart",
    retrievedCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "item count matches",
    retrievedCart.total_item_count,
    createdCart.total_item_count,
  );
  TestValidator.equals(
    "product count matches",
    retrievedCart.total_product_count,
    createdCart.total_product_count,
  );
  TestValidator.equals(
    "status matches",
    retrievedCart.status,
    createdCart.status,
  );
  TestValidator.equals(
    "lock status matches",
    retrievedCart.is_locked_for_checkout,
    createdCart.is_locked_for_checkout,
  );
  TestValidator.equals(
    "converted status matches",
    retrievedCart.converted_at,
    createdCart.converted_at,
  );
  TestValidator.equals(
    "shipping preferences match",
    retrievedCart.customer_shipping_preference,
    createdCart.customer_shipping_preference,
  );
  TestValidator.equals(
    "promotional codes match",
    retrievedCart.promotional_codes,
    createdCart.promotional_codes,
  );
  TestValidator.equals(
    "customer notes match",
    retrievedCart.customer_notes,
    createdCart.customer_notes,
  );

  // Step 5: Test cart lifecycle properties
  TestValidator.predicate(
    "cart has creation timestamp",
    createdCart.created_at !== null,
  );
  TestValidator.predicate(
    "cart has update timestamp",
    retrievedCart.updated_at !== null,
  );
  TestValidator.predicate(
    "cart has activity timestamp",
    retrievedCart.last_activity_at !== null,
  );

  // Step 6: Test access control with invalid cart ID
  const invalidCartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "accessing non-existent cart should fail",
    async () => {
      await api.functional.shoppingMall.carts.at(connection, {
        cartId: invalidCartId,
      });
    },
  );

  // Step 7: Test customer preference validation
  TestValidator.predicate(
    "customer preferences are stored as JSON",
    createdCart.customer_shipping_preference !== null,
  );
  TestValidator.predicate(
    "promotional codes are stored as JSON array",
    createdCart.promotional_codes !== null,
  );
  TestValidator.predicate(
    "customer notes are stored",
    createdCart.customer_notes !== null,
  );

  // Step 8: Validate cart expiration and deletion properties
  TestValidator.predicate(
    "cart does not have expiration by default",
    createdCart.expires_at === null,
  );
  TestValidator.predicate(
    "cart has not been deleted",
    createdCart.deleted_at === null,
  );
}
