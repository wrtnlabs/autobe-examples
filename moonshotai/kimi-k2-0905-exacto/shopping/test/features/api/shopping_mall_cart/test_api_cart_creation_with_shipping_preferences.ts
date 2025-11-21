import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test cart creation with customer shipping preferences configured from the
 * beginning to support immediate shopping session setup. Verify proper
 * configuration parsing, preference validation, and default preference
 * assignment while ensuring shipping preference applications work correctly
 * throughout the cart lifecycle across multi-seller scenarios.
 *
 * This test validates:
 *
 * 1. Cart creation with various shipping preferences
 * 2. Configuration parsing and validation
 * 3. Default preference assignment
 * 4. Multi-seller shipping preference handling
 * 5. Cart lifecycle properties and timestamps
 */
export async function test_api_cart_creation_with_shipping_preferences(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Cart with standard shipping preference
  const standardShippingPreference = JSON.stringify({
    method: "standard",
    carrier: "UPS",
    speed: "3-5 days",
    cost: 5.99,
  });

  const standardCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: standardShippingPreference,
        customer_notes: "Please handle with care",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(standardCart);

  TestValidator.equals(
    "standard shipping preference set",
    standardCart.customer_shipping_preference,
    standardShippingPreference,
  );
  TestValidator.equals(
    "customer notes stored",
    standardCart.customer_notes,
    "Please handle with care",
  );
  TestValidator.predicate(
    "notes length within limit",
    (() => {
      const notes = standardCart.customer_notes || "";
      return notes.length <= 1000;
    })(),
  );

  // Test 2: Cart with expedited shipping preference
  const expeditedShippingPreference = JSON.stringify({
    method: "expedited",
    carrier: "FedEx",
    speed: "1-2 days",
    cost: 15.99,
  });

  const expeditedCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: expeditedShippingPreference,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(expeditedCart);

  TestValidator.equals(
    "expedited shipping preference set",
    expeditedCart.customer_shipping_preference,
    expeditedShippingPreference,
  );

  // Test 3: Cart with promotional codes and shipping preferences
  const cartWithPromotions = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: standardShippingPreference,
        promotional_codes: JSON.stringify(["SHIPFREE", "SAVE10"]),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithPromotions);

  TestValidator.equals(
    "shipping and promotions configured",
    cartWithPromotions.customer_shipping_preference,
    standardShippingPreference,
  );
  TestValidator.equals(
    "promotional codes stored",
    cartWithPromotions.promotional_codes,
    JSON.stringify(["SHIPFREE", "SAVE10"]),
  );

  // Test 4: Empty cart with null preferences
  const emptyCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {
      customer_shipping_preference: null,
      promotional_codes: null,
      customer_notes: null,
    } satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(emptyCart);

  TestValidator.equals(
    "null shipping preference",
    emptyCart.customer_shipping_preference,
    null,
  );
  TestValidator.equals(
    "null promotional codes",
    emptyCart.promotional_codes,
    null,
  );
  TestValidator.equals("null customer notes", emptyCart.customer_notes, null);

  // Test 5: Completely empty cart (all optional fields omitted)
  const minimalCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(minimalCart);

  TestValidator.equals(
    "minimal cart undefined shipping",
    minimalCart.customer_shipping_preference,
    undefined,
  );
  TestValidator.equals(
    "minimal cart status active",
    minimalCart.status,
    "active",
  );
  TestValidator.equals(
    "minimal cart not locked",
    minimalCart.is_locked_for_checkout,
    false,
  );
  TestValidator.equals(
    "minimal cart zero items",
    minimalCart.total_item_count,
    0,
  );
  TestValidator.equals(
    "minimal cart zero products",
    minimalCart.total_product_count,
    0,
  );

  // Test 6: Premium shipping with additional options (multi-seller scenario)
  const premiumShippingPreference = JSON.stringify({
    method: "premium",
    carrier: "UPS",
    speed: "next day",
    cost: 29.99,
    insurance: true,
    signature_required: true,
    multi_seller_coordination: true,
  });

  const premiumCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: premiumShippingPreference,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(premiumCart);

  TestValidator.equals(
    "premium shipping preference",
    premiumCart.customer_shipping_preference,
    premiumShippingPreference,
  );

  // Validate timestamp properties for cart lifecycle
  TestValidator.predicate(
    "created timestamp valid",
    !isNaN(new Date(premiumCart.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated timestamp valid",
    !isNaN(new Date(premiumCart.updated_at).getTime()),
  );
  TestValidator.predicate(
    "last activity timestamp valid",
    !isNaN(new Date(premiumCart.last_activity_at).getTime()),
  );
  TestValidator.predicate(
    "timestamps reasonable",
    (() => {
      const created = new Date(premiumCart.created_at);
      const updated = new Date(premiumCart.updated_at);
      const activity = new Date(premiumCart.last_activity_at);
      return (
        created.getTime() <= updated.getTime() &&
        created.getTime() <= activity.getTime() &&
        updated.getTime() <= activity.getTime()
      );
    })(),
  );
}
