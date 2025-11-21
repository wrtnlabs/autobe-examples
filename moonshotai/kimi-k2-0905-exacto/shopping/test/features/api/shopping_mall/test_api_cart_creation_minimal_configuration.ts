import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation with minimal configuration - no optional fields
 * provided. Validates that cart creation succeeds with only required implicit
 * data and optional fields default to null values. Tests proper handling of
 * empty request bodies and ensures basic cart initialization works even when
 * customers provide no initial preferences. Ensures system robustness for
 * customers who prefer to configure their cart during the shopping process
 * rather than at creation time, supporting both customer experience patterns
 * effectively.
 */
export async function test_api_cart_creation_minimal_configuration(
  connection: api.IConnection,
) {
  // Test 1: Create cart with completely empty body
  const emptyCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {} satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(emptyCart);

  // Validate that cart was created with proper defaults despite empty body
  TestValidator.predicate(
    "empty cart has zero items",
    emptyCart.total_item_count === 0,
  );
  TestValidator.predicate(
    "empty cart has zero products",
    emptyCart.total_product_count === 0,
  );
  TestValidator.predicate(
    "empty cart has active status",
    emptyCart.status === "active",
  );
  TestValidator.predicate(
    "empty cart is not locked",
    !emptyCart.is_locked_for_checkout,
  );
  TestValidator.equals(
    "empty cart has null shipping preference",
    emptyCart.customer_shipping_preference,
    null,
  );
  TestValidator.equals(
    "empty cart has null promotional codes",
    emptyCart.promotional_codes,
    null,
  );
  TestValidator.equals(
    "empty cart has null customer notes",
    emptyCart.customer_notes,
    null,
  );
  TestValidator.equals(
    "empty cart has null converted at",
    emptyCart.converted_at,
    null,
  );
  TestValidator.equals(
    "empty cart has null deleted at",
    emptyCart.deleted_at,
    null,
  );

  // Validate generated fields are properly set
  typia.assert<string & tags.Format<"uuid">>(emptyCart.id);
  typia.assert<string & tags.Format<"date-time">>(emptyCart.created_at);
  typia.assert<string & tags.Format<"date-time">>(emptyCart.updated_at);
  typia.assert<string & tags.Format<"date-time">>(emptyCart.last_activity_at);

  // Test 2: Create cart with explicit null values (should behave same as empty)
  const explicitNullCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: null,
        promotional_codes: null,
        customer_notes: null,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(explicitNullCart);

  // Should be functionally equivalent to empty body cart
  TestValidator.predicate(
    "explicit null cart has same item count as empty cart",
    explicitNullCart.total_item_count === emptyCart.total_item_count,
  );
  TestValidator.predicate(
    "explicit null cart has same product count as empty cart",
    explicitNullCart.total_product_count === emptyCart.total_product_count,
  );
  TestValidator.predicate(
    "explicit null cart has same status as empty cart",
    explicitNullCart.status === emptyCart.status,
  );
  TestValidator.equals(
    "explicit null cart has null shipping preference",
    explicitNullCart.customer_shipping_preference,
    null,
  );
  TestValidator.equals(
    "explicit null cart has null promotional codes",
    explicitNullCart.promotional_codes,
    null,
  );
  TestValidator.equals(
    "explicit null cart has null customer notes",
    explicitNullCart.customer_notes,
    null,
  );

  // Test 3: Verify UUID format and uniqueness
  TestValidator.notEquals(
    "different carts have different IDs",
    emptyCart.id,
    explicitNullCart.id,
  );

  // Test 4: Verify timestamps are recent and in correct order
  const now = new Date().toISOString();
  const createdDiff = Math.abs(
    new Date(now).getTime() - new Date(emptyCart.created_at).getTime(),
  );
  TestValidator.predicate(
    "created_at is recent (within 5 seconds)",
    createdDiff < 5000,
  );

  // created_at and updated_at should be identical for new carts
  TestValidator.equals(
    "created_at equals updated_at for new cart",
    emptyCart.created_at,
    emptyCart.updated_at,
  );
  TestValidator.equals(
    "last_activity_at equals created_at for new cart",
    emptyCart.created_at,
    emptyCart.last_activity_at,
  );

  // Test 5: Verify optional fields truly default to undefined when using different request bodies
  const randomData = typia.random<IShoppingMallCart.ICreate>();
  const randomCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: randomData,
    },
  );
  typia.assert(randomCart);

  // When all fields are provided, they should be preserved (not the focus of this test but validates the API)
  TestValidator.predicate(
    "random cart has expected shipping preference",
    randomCart.customer_shipping_preference === null ||
      randomCart.customer_shipping_preference ===
        randomData.customer_shipping_preference,
  );

  TestValidator.predicate(
    "random cart has expected promotional codes",
    randomCart.promotional_codes === null ||
      randomCart.promotional_codes === randomData.promotional_codes,
  );

  TestValidator.predicate(
    "random cart has expected customer notes",
    randomCart.customer_notes === null ||
      randomCart.customer_notes === randomData.customer_notes,
  );

  // Test 6: Verify that minimal configuration carts can be used in later operations
  // Create a second empty cart to demonstrate session management
  const sessionCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {},
    },
  );
  typia.assert(sessionCart);

  // Verify we have multiple independent cart sessions
  TestValidator.notEquals(
    "session cart has different ID",
    sessionCart.id,
    emptyCart.id,
  );
  TestValidator.equals(
    "session cart has same status",
    sessionCart.status,
    emptyCart.status,
  );
  TestValidator.equals(
    "session cart has same item counts",
    sessionCart.total_item_count,
    emptyCart.total_item_count,
  );
}
