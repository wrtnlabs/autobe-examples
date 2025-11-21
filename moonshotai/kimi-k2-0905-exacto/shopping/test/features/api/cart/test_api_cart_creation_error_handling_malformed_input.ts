import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

export async function test_api_cart_creation_error_handling_malformed_input(
  connection: api.IConnection,
) {
  // Test 1: Valid cart creation (baseline)
  const validCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {
      customer_shipping_preference: JSON.stringify({
        method: "standard",
        carrier: "UPS",
      }),
      promotional_codes: JSON.stringify(["SAVE10", "WELCOME20"]),
      customer_notes: "Please handle with care",
    } satisfies IShoppingMallCart.ICreate,
  });
  typia.assert(validCart);

  // Test 2: Null values in optional fields (should be valid)
  const cartWithNulls = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: null,
        promotional_codes: null,
        customer_notes: null,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithNulls);
  TestValidator.equals(
    "cart with nulls should have null optional fields",
    cartWithNulls.customer_shipping_preference,
    null,
  );

  // Test 3: Undefined values (should be valid)
  const cartWithUndefined = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithUndefined);

  // Test 4: Empty strings in optional fields
  const cartWithEmptyStrings = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: "",
        promotional_codes: "",
        customer_notes: "",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartWithEmptyStrings);

  // Test 5: Boundary condition - maximum valid structured data
  const complexShippingPreference = JSON.stringify({
    method: "express",
    carrier: "FedEx",
    options: ["tracking", "insurance", "signature"],
    deliveryWindow: "business-hours",
    specialInstructions: "Leave at front door",
  });
  const boundaryCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: complexShippingPreference,
        promotional_codes: JSON.stringify([
          "SAVE10",
          "WELCOME20",
          "SHIPFREE",
          "NEWCUSTOMER",
          "BUNDLE5",
        ]),
        customer_notes: "Please deliver between 9 AM and 5 PM",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(boundaryCart);

  // Test 6: Business logic - promotional codes with invalid merchant references
  await TestValidator.error(
    "should reject promotional codes with invalid merchant references",
    async () => {
      await api.functional.shoppingMall.carts.create(connection, {
        body: {
          customer_shipping_preference: JSON.stringify({ method: "standard" }),
          promotional_codes: JSON.stringify(["INVALID_MERCHANT_12345"]),
          customer_notes: "Test with invalid merchant promo",
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Test 7: Shipping preference for unsupported regions
  await TestValidator.error(
    "should reject shipping preferences for unsupported regions",
    async () => {
      await api.functional.shoppingMall.carts.create(connection, {
        body: {
          customer_shipping_preference: JSON.stringify({
            method: "international",
            carrier: "DHL",
            destination: "Antarctica Research Station",
          }),
          promotional_codes: JSON.stringify(["SHIPFREE"]),
          customer_notes: "Test international shipping",
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Test 8: Duplicate promotional codes application
  await TestValidator.error(
    "should reject duplicate promotional codes",
    async () => {
      await api.functional.shoppingMall.carts.create(connection, {
        body: {
          customer_shipping_preference: JSON.stringify({ method: "expedited" }),
          promotional_codes: JSON.stringify(["SAVE10", "SAVE10", "SAVE10"]),
          customer_notes: "Testing duplicate codes",
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Test 9: Expired promotional codes
  await TestValidator.error(
    "should reject expired promotional codes",
    async () => {
      await api.functional.shoppingMall.carts.create(connection, {
        body: {
          customer_shipping_preference: JSON.stringify({ method: "overnight" }),
          promotional_codes: JSON.stringify(["EXPIRED_SUMMER_2023"]),
          customer_notes: "Testing expired code",
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Test 10: Maximum character count for customer notes
  const maxLengthNotes = RandomGenerator.content({
    paragraphs: 15,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const maxNotesCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_shipping_preference: JSON.stringify({
          method: "priority",
          options: ["tracking"],
        }),
        promotional_codes: JSON.stringify(["MAXSAVE"]),
        customer_notes: maxLengthNotes,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(maxNotesCart);
}
