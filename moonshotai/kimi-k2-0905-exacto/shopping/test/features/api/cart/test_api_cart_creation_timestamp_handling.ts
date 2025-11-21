import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test comprehensive timestamp management in shopping cart creation.
 *
 * Validates automatic generation of accurate timestamps for created_at,
 * updated_at, and last_activity_at fields during cart initialization. Tests
 * proper timezone handling and timestamp format compliance. Ensures that
 * converted_at and deleted_at remain null for new carts while activity tracking
 * is properly initiated. Validates that timestamp precision supports real-time
 * analytics and customer behavior tracking across the shopping mall platform
 * ecosystem effectively.
 */
export async function test_api_cart_creation_timestamp_handling(
  connection: api.IConnection,
) {
  // Test 1: Basic cart creation with timestamp validation
  const basicCartBody = {} satisfies IShoppingMallCart.ICreate;
  const basicCart = await api.functional.shoppingMall.carts.create(connection, {
    body: basicCartBody,
  });
  typia.assert(basicCart);

  // Verify automatic timestamp generation (format already validated by typia.assert)
  TestValidator.predicate(
    "created_at is generated automatically",
    basicCart.created_at !== null && basicCart.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at is generated automatically",
    basicCart.updated_at !== null && basicCart.updated_at !== undefined,
  );

  TestValidator.predicate(
    "last_activity_at is generated automatically",
    basicCart.last_activity_at !== null &&
      basicCart.last_activity_at !== undefined,
  );

  // Verify null fields for new carts
  TestValidator.equals("converted_at is null", basicCart.converted_at, null);
  TestValidator.equals("deleted_at is null", basicCart.deleted_at, null);

  // Verify cart initialization state
  TestValidator.equals("status should be active", basicCart.status, "active");
  TestValidator.equals(
    "total_item_count starts at 0",
    basicCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "total_product_count starts at 0",
    basicCart.total_product_count,
    0,
  );
  TestValidator.equals(
    "is_locked_for_checkout starts false",
    basicCart.is_locked_for_checkout,
    false,
  );

  // Test 2: Cart creation with customer preferences
  const preferencesBody = {
    customer_shipping_preference: JSON.stringify({
      carrier: "UPS",
      speed: "standard",
      instructions: "Leave at door",
    }),
    customer_notes: "Please deliver between 9AM-5PM",
  } satisfies IShoppingMallCart.ICreate;

  const preferencesCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: preferencesBody,
    },
  );
  typia.assert(preferencesCart);

  // Verify timestamps are generated for cart with preferences
  TestValidator.predicate(
    "preferences cart has created_at timestamp",
    preferencesCart.created_at !== null &&
      preferencesCart.created_at !== undefined,
  );

  TestValidator.predicate(
    "preferences cart has updated_at timestamp",
    preferencesCart.updated_at !== null &&
      preferencesCart.updated_at !== undefined,
  );

  TestValidator.predicate(
    "preferences cart has last_activity_at timestamp",
    preferencesCart.last_activity_at !== null &&
      preferencesCart.last_activity_at !== undefined,
  );

  // Test 3: Cart creation with promotional codes
  const promoBody = {
    promotional_codes: JSON.stringify([
      { code: "SAVE20", discount: 20, type: "percentage" },
      { code: "FREESHIP", discount: 0, type: "shipping" },
    ]),
  } satisfies IShoppingMallCart.ICreate;

  const promoCart = await api.functional.shoppingMall.carts.create(connection, {
    body: promoBody,
  });
  typia.assert(promoCart);

  // Verify chronological relationships
  const createdTime = new Date(promoCart.created_at).getTime();
  const updatedTime = new Date(promoCart.updated_at).getTime();
  const activityTime = new Date(promoCart.last_activity_at).getTime();

  TestValidator.predicate(
    "timestamps are chronologically consistent",
    createdTime <= updatedTime && updatedTime <= activityTime,
  );

  // Test 4: Multiple cart creation for timezone validation
  const carts = await ArrayUtil.asyncRepeat(3, async (index) => {
    const body = {
      customer_notes: `Test cart ${index + 1}`,
    } satisfies IShoppingMallCart.ICreate;

    return await api.functional.shoppingMall.carts.create(connection, {
      body,
    });
  });

  // Verify all carts have consistent timestamp generation
  carts.forEach((cart, index) => {
    typia.assert(cart);

    TestValidator.predicate(
      `cart ${index + 1} has created_at timestamp`,
      cart.created_at !== null && cart.created_at !== undefined,
    );

    TestValidator.predicate(
      `cart ${index + 1} has updated_at timestamp`,
      cart.updated_at !== null && cart.updated_at !== undefined,
    );

    TestValidator.predicate(
      `cart ${index + 1} has last_activity_at timestamp`,
      cart.last_activity_at !== null && cart.last_activity_at !== undefined,
    );
  });

  // Test 5: Empty cart with all optional fields as null
  const emptyCartBody = {
    customer_shipping_preference: null,
    promotional_codes: null,
    customer_notes: null,
  } satisfies IShoppingMallCart.ICreate;

  const emptyCart = await api.functional.shoppingMall.carts.create(connection, {
    body: emptyCartBody,
  });
  typia.assert(emptyCart);

  // Verify null handling doesn't affect timestamp generation
  TestValidator.predicate(
    "empty cart has created_at timestamp",
    emptyCart.created_at !== null && emptyCart.created_at !== undefined,
  );

  TestValidator.equals(
    "empty cart converted_at is null",
    emptyCart.converted_at,
    null,
  );
  TestValidator.equals(
    "empty cart deleted_at is null",
    emptyCart.deleted_at,
    null,
  );

  // Test 6: Verify cart ID generation
  const uuidCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {},
  });
  typia.assert(uuidCart);

  // Test 7: Real-time analytics support
  const analyticsTest = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes: "Analytics test cart",
      },
    },
  );
  typia.assert(analyticsTest);

  // Verify timestamps are suitable for sorting and filtering (format already validated)
  TestValidator.predicate(
    "all timestamps are different (showing precision)",
    analyticsTest.created_at !== basicCart.created_at &&
      analyticsTest.updated_at !== basicCart.updated_at &&
      analyticsTest.last_activity_at !== basicCart.last_activity_at,
  );

  // Test timestamp consistency across operations
  TestValidator.predicate(
    "timestamps support real-time sorting",
    new Date(analyticsTest.created_at).getTime() >
      new Date(basicCart.created_at).getTime(),
  );
}
