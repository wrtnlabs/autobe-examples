import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test concurrent cart creation handling across multiple sessions
 *
 * This test validates the system's ability to properly handle concurrent cart
 * creation requests, ensuring unique identifier generation, proper session
 * isolation, and maintaining data integrity when multiple carts are created
 * simultaneously.
 *
 * Test flow:
 *
 * 1. Create multiple carts concurrently to simulate multi-device/session scenarios
 * 2. Verify each cart receives a unique identifier
 * 3. Validate proper initialization of cart properties
 * 4. Confirm session isolation between different carts
 * 5. Test various cart configurations with different preferences
 */
export async function test_api_cart_creation_concurrent_session_handling(
  connection: api.IConnection,
) {
  // Test concurrent cart creation with different configurations
  const cartConfigurations = [
    {
      customer_shipping_preference: JSON.stringify({
        method: "standard",
        carrier: "UPS",
      }),
      promotional_codes: JSON.stringify(["SAVE10", "WELCOME20"]),
      customer_notes: "Please deliver between 9 AM - 5 PM",
    },
    {
      customer_shipping_preference: JSON.stringify({
        method: "expedited",
        carrier: "FedEx",
      }),
      promotional_codes: JSON.stringify(["FREESHIP"]),
      customer_notes: "Gift wrapping requested",
    },
    {
      customer_notes: "Leave package at front door",
    },
    {}, // Empty configuration for default cart
  ];

  // Create multiple carts concurrently
  const cartPromises = cartConfigurations.map((config) =>
    api.functional.shoppingMall.carts.create(connection, {
      body: config satisfies IShoppingMallCart.ICreate,
    }),
  );

  const createdCarts = await Promise.all(cartPromises);

  // Validate each cart has unique ID
  const cartIds = createdCarts.map((cart) => cart.id);
  TestValidator.equals(
    "all cart IDs are unique",
    new Set(cartIds).size,
    cartIds.length,
  );

  // Validate cart properties
  createdCarts.forEach((cart, index) => {
    typia.assert(cart);

    // Verify cart initialization
    TestValidator.equals(
      `cart ${index + 1} has valid total_item_count`,
      cart.total_item_count,
      0,
    );
    TestValidator.equals(
      `cart ${index + 1} has valid total_product_count`,
      cart.total_product_count,
      0,
    );
    TestValidator.equals(
      `cart ${index + 1} has active status`,
      cart.status,
      "active",
    );
    TestValidator.equals(
      `cart ${index + 1} is not locked`,
      cart.is_locked_for_checkout,
      false,
    );
    TestValidator.predicate(
      `cart ${index + 1} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cart.id,
      ),
    );

    // Verify timestamps
    TestValidator.predicate(
      `cart ${index + 1} has valid created_at`,
      new Date(cart.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      `cart ${index + 1} has valid updated_at`,
      new Date(cart.updated_at).getTime() > 0,
    );
    TestValidator.predicate(
      `cart ${index + 1} has valid last_activity_at`,
      new Date(cart.last_activity_at).getTime() > 0,
    );

    // Verify configuration preferences if provided
    if (cartConfigurations[index].customer_shipping_preference) {
      TestValidator.equals(
        `cart ${index + 1} has shipping preference`,
        cart.customer_shipping_preference,
        cartConfigurations[index].customer_shipping_preference,
      );
    }
    if (cartConfigurations[index].promotional_codes) {
      TestValidator.equals(
        `cart ${index + 1} has promotional codes`,
        cart.promotional_codes,
        cartConfigurations[index].promotional_codes,
      );
    }
    if (cartConfigurations[index].customer_notes) {
      TestValidator.equals(
        `cart ${index + 1} has customer notes`,
        cart.customer_notes,
        cartConfigurations[index].customer_notes,
      );
    }
  });

  // Test rapid sequential cart creation
  const sequentialCarts = await ArrayUtil.asyncRepeat(5, async (index) => {
    return await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_notes: `Sequential cart ${index + 1}`,
      } satisfies IShoppingMallCart.ICreate,
    });
  });

  // Validate sequential carts
  sequentialCarts.forEach((cart, index) => {
    typia.assert(cart);
    TestValidator.equals(
      `sequential cart ${index + 1} has zero items`,
      cart.total_item_count,
      0,
    );
    TestValidator.equals(
      `sequential cart ${index + 1} is active`,
      cart.status,
      "active",
    );
  });

  // Verify all carts have unique IDs across concurrent and sequential creation
  const allCartIds = [...cartIds, ...sequentialCarts.map((c) => c.id)];
  TestValidator.equals(
    "all carts have unique IDs across tests",
    new Set(allCartIds).size,
    allCartIds.length,
  );

  // Test cart creation with edge case configurations
  const edgeCaseCarts = await Promise.all([
    api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: JSON.stringify({}).toString(),
        promotional_codes: JSON.stringify([]).toString(),
      } satisfies IShoppingMallCart.ICreate,
    }),
    api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_notes: "",
      } satisfies IShoppingMallCart.ICreate,
    }),
  ]);

  edgeCaseCarts.forEach((cart) => {
    typia.assert(cart);
    TestValidator.equals(
      "edge case cart has valid structure",
      typeof cart.id,
      "string",
    );
    TestValidator.equals("edge case cart is active", cart.status, "active");
  });
}
