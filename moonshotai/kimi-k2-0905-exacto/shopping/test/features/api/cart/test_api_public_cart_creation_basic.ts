import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

export async function test_api_public_cart_creation_basic(
  connection: api.IConnection,
) {
  // Test 1: Create basic cart with no optional parameters
  const basicCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {},
    });
  typia.assert(basicCart);

  TestValidator.predicate(
    "basic cart has proper initial status",
    basicCart.status === "active",
  );
  TestValidator.predicate(
    "basic cart is not locked for checkout",
    basicCart.is_locked_for_checkout === false,
  );
  TestValidator.predicate(
    "basic cart starts with zero items",
    basicCart.total_item_count === 0,
  );
  TestValidator.predicate(
    "basic cart starts with zero products",
    basicCart.total_product_count === 0,
  );
  TestValidator.predicate(
    "basic cart has formatted ID",
    basicCart.id.length > 0,
  );
  TestValidator.predicate(
    "basic cart has creation timestamp",
    basicCart.created_at.length > 0,
  );
  TestValidator.predicate(
    "basic cart has activity timestamp",
    basicCart.last_activity_at.length > 0,
  );
  TestValidator.predicate(
    "basic cart has update timestamp",
    basicCart.updated_at.length > 0,
  );

  // Test 2: Create cart with shipping preference
  const shippingPreferenceData = {
    carrier: "UPS",
    delivery_speed: "standard",
  };

  const cartWithShipping: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_shipping_preference: JSON.stringify(shippingPreferenceData),
      },
    });
  typia.assert(cartWithShipping);

  TestValidator.predicate(
    "cart with shipping has shipping preference set",
    cartWithShipping.customer_shipping_preference !== null &&
      cartWithShipping.customer_shipping_preference !== undefined,
  );
  TestValidator.equals(
    "cart with shipping preference matches input",
    cartWithShipping.customer_shipping_preference,
    JSON.stringify(shippingPreferenceData),
  );
  TestValidator.predicate(
    "cart with shipping has proper status",
    cartWithShipping.status === "active",
  );

  // Test 3: Create cart with promotional codes
  const activePromoCodes = ["SUMMER2024", "WELCOME10", "SAVE20"];

  const cartWithPromotions: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        promotional_codes: JSON.stringify(activePromoCodes),
      },
    });
  typia.assert(cartWithPromotions);

  TestValidator.predicate(
    "cart with promotions has promotional codes set",
    cartWithPromotions.promotional_codes !== null &&
      cartWithPromotions.promotional_codes !== undefined,
  );
  TestValidator.equals(
    "cart with promotional codes matches input",
    cartWithPromotions.promotional_codes,
    JSON.stringify(activePromoCodes),
  );
  TestValidator.predicate(
    "cart with promotions has proper status",
    cartWithPromotions.status === "active",
  );

  // Test 4: Create cart with customer notes
  const customerNoteText =
    "Please wrap items as gifts and include gift receipt";

  const cartWithNotes: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: {
        customer_notes: customerNoteText,
      },
    });
  typia.assert(cartWithNotes);

  TestValidator.predicate(
    "cart with notes has customer notes set",
    cartWithNotes.customer_notes !== null &&
      cartWithNotes.customer_notes !== undefined,
  );
  TestValidator.equals(
    "cart with customer notes matches input",
    cartWithNotes.customer_notes,
    customerNoteText,
  );
  TestValidator.predicate(
    "cart with notes has proper status",
    cartWithNotes.status === "active",
  );

  // Test 5: Create cart with all optional parameters
  const requestBodyWithAllOptions = {
    customer_shipping_preference: JSON.stringify({
      carrier: "FedEx",
      delivery_speed: "expedited",
    }),
    promotional_codes: JSON.stringify(["EXTRA5"]),
    customer_notes: "Handle with care - contains delicate items",
  };

  const cartWithAllOptions: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, {
      body: requestBodyWithAllOptions satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cartWithAllOptions);

  TestValidator.predicate(
    "cart with all options has shipping preference",
    cartWithAllOptions.customer_shipping_preference ===
      requestBodyWithAllOptions.customer_shipping_preference,
  );
  TestValidator.predicate(
    "cart with all options has promotional codes",
    cartWithAllOptions.promotional_codes ===
      requestBodyWithAllOptions.promotional_codes,
  );
  TestValidator.predicate(
    "cart with all options has customer notes",
    cartWithAllOptions.customer_notes ===
      requestBodyWithAllOptions.customer_notes,
  );

  // Test 6: Verify unique ID generation across multiple carts
  const cartIds = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.carts.create(connection, { body: {} });
    typia.assert(cart);
    cartIds.add(cart.id);
  }

  TestValidator.equals("all 5 carts have unique IDs", cartIds.size, 5);

  // Test 7: Verify timestamp fields are present
  const timestampCart: IShoppingMallCart =
    await api.functional.shoppingMall.carts.create(connection, { body: {} });
  typia.assert(timestampCart);

  TestValidator.predicate(
    "created_at field exists",
    timestampCart.created_at !== null && timestampCart.created_at !== undefined,
  );
  TestValidator.predicate(
    "last_activity_at field exists",
    timestampCart.last_activity_at !== null &&
      timestampCart.last_activity_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at field exists",
    timestampCart.updated_at !== null && timestampCart.updated_at !== undefined,
  );

  // Test 8: Verify conversion fields are null for new cart
  TestValidator.predicate(
    "converted_at is null for new cart",
    timestampCart.converted_at === null,
  );
  TestValidator.predicate(
    "deleted_at is null for new cart",
    timestampCart.deleted_at === null,
  );
}
