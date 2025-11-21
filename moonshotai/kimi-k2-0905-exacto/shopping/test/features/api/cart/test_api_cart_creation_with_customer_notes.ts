import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart creation with customer notes and special instructions.
 * Validates free-form customer communication for delivery preferences, gift
 * messaging, and order coordination requests.
 *
 * This test ensures the shopping cart creation API properly handles customer
 * notes with business-relevant information, validates the 1000-character limit,
 * and maintains proper formatting.
 *
 * 1. Create cart with normal customer notes (delivery instructions)
 * 2. Create cart with gift messaging
 * 3. Create cart with order coordination requests
 * 4. Test 1000-character limit boundary with realistic content
 * 5. Verify cart properties are properly initialized
 * 6. Test that notes are stored and accessible for cart-to-order workflow
 */
export async function test_api_cart_creation_with_customer_notes(
  connection: api.IConnection,
) {
  // Test 1: Create cart with delivery instructions
  const deliveryNotes = {
    customer_notes:
      "Please deliver between 9am-5pm. Ring doorbell twice. Leave package behind the planter if no answer.",
  } satisfies IShoppingMallCart.ICreate;

  const cart1 = await api.functional.shoppingMall.carts.create(connection, {
    body: deliveryNotes,
  });
  typia.assert(cart1);

  TestValidator.equals(
    "delivery notes stored correctly",
    cart1.customer_notes,
    deliveryNotes.customer_notes,
  );
  TestValidator.equals(
    "cart initialized with correct item count",
    cart1.total_item_count,
    0,
  );
  TestValidator.equals(
    "cart initialized with correct product count",
    cart1.total_product_count,
    0,
  );
  TestValidator.equals("cart status is active", cart1.status, "active");
  TestValidator.predicate(
    "cart is not locked for checkout",
    !cart1.is_locked_for_checkout,
  );

  // Test 2: Create cart with gift messaging
  const giftNotes = {
    customer_notes:
      "This is a gift for my daughter's birthday. Please include a gift receipt and wrap it nicely.",
  } satisfies IShoppingMallCart.ICreate;

  const cart2 = await api.functional.shoppingMall.carts.create(connection, {
    body: giftNotes,
  });
  typia.assert(cart2);

  TestValidator.equals(
    "gift notes stored correctly",
    cart2.customer_notes,
    giftNotes.customer_notes,
  );

  // Test 3: Create cart with order coordination requests
  const coordinationNotes = {
    customer_notes:
      "Please coordinate delivery with building management. Call 555-0123 upon arrival. Building code: 1234.",
  } satisfies IShoppingMallCart.ICreate;

  const cart3 = await api.functional.shoppingMall.carts.create(connection, {
    body: coordinationNotes,
  });
  typia.assert(cart3);

  TestValidator.equals(
    "coordination notes stored correctly",
    cart3.customer_notes,
    coordinationNotes.customer_notes,
  );

  // Test 4: Create cart with complex business notes (long but valid content)
  const complexNotes = {
    customer_notes:
      "Multi-seller coordination required. Apartment 4B. Call 30 minutes before arrival. Gate code 4729. Building manager: John Smith (555-0199). Elevator reservation needed for large items. Delivery window: 10am-2pm weekdays only.",
  } satisfies IShoppingMallCart.ICreate;

  const complexCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: complexNotes,
    },
  );
  typia.assert(complexCart);

  TestValidator.equals(
    "complex notes stored correctly",
    complexCart.customer_notes,
    complexNotes.customer_notes,
  );

  // Test 5: Create cart with promotional codes and shipping preferences along with notes
  const fullConfigCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes:
          "Priority delivery requested. Customer is hearing impaired. Please text upon arrival at 555-0155. Preferred carrier: FedEx Ground.",
        customer_shipping_preference: JSON.stringify({
          carrier: "FedEx",
          service: "Ground",
          priority: "high",
        }),
        promotional_codes: JSON.stringify(["SAVE20", "FREESHIP"]),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(fullConfigCart);

  TestValidator.equals(
    "full configuration notes stored correctly",
    fullConfigCart.customer_notes,
    "Priority delivery requested. Customer is hearing impaired. Please text upon arrival at 555-0155. Preferred carrier: FedEx Ground.",
  );
  TestValidator.predicate(
    "shipping preferences stored",
    fullConfigCart.customer_shipping_preference !== undefined,
  );
  TestValidator.predicate(
    "promotional codes stored",
    fullConfigCart.promotional_codes !== undefined,
  );

  // Test 6: Test near 1000-character limit with realistic business content
  const nearMaxNotes = ArrayUtil.repeat(40, () =>
    RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 6 }),
  )
    .join(" ")
    .substring(0, 995);

  const nearMaxCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes: nearMaxNotes,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(nearMaxCart);

  TestValidator.predicate(
    "near-max notes stored correctly",
    nearMaxCart.customer_notes === nearMaxNotes,
  );

  // Test 7: Verify timestamps are properly set and configurable properties work
  const timestampCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: {
        customer_notes:
          "Testing cart creation with timestamps and property validation",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(timestampCart);

  const createdAt = new Date(timestampCart.created_at);
  const lastActivity = new Date(timestampCart.last_activity_at);

  TestValidator.predicate(
    "timestamps are valid ISO strings",
    createdAt.getTime() > 0,
  );
  TestValidator.predicate(
    "last activity timestamp recorded",
    lastActivity.getTime() > 0,
  );
  TestValidator.predicate(
    "activity follows creation",
    lastActivity.getTime() >= createdAt.getTime(),
  );
  TestValidator.predicate(
    "cart not converted initially",
    timestampCart.converted_at === null,
  );
  TestValidator.predicate(
    "cart has valid expiration",
    timestampCart.expires_at !== null,
  );

  // Test 8: Verify cart ID is valid UUID format
  TestValidator.predicate(
    "cart ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      timestampCart.id,
    ),
  );
}
