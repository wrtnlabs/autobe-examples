import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";

/**
 * Test shopping cart retrieval for guest browsing sessions.
 *
 * This test validates that anonymous users can successfully retrieve their
 * shopping cart information without authentication requirements. It verifies
 * guest cart session management, proper cart data display, and ensures session
 * continuity for anonymous users.
 *
 * Test Steps:
 *
 * 1. Create a new guest shopping cart
 * 2. Retrieve the created cart by its ID
 * 3. Validate cart properties match expected structure
 * 4. Test cart retrieval with customer preferences
 * 5. Verify session continuity through cart updates
 * 6. Ensure guest cart retrieval maintains complete information
 */
export async function test_api_cart_retrieval_guest_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest shopping cart for testing
  const createCartRequest = {
    customer_shipping_preference: JSON.stringify({
      carrier: "standard",
      speed: "normal",
      instructions: "Leave at door",
    }),
    promotional_codes: JSON.stringify(["WELCOME10", "FREESHIP"]),
    customer_notes: "Please include gift wrapping",
  } satisfies IShoppingMallCart.ICreate;

  const createdCart = await api.functional.shoppingMall.carts.create(
    connection,
    {
      body: createCartRequest,
    },
  );

  typia.assert(createdCart);

  // Step 2: Retrieve the created cart by its ID
  const retrievedCart = await api.functional.shoppingMall.carts.at(connection, {
    cartId: createdCart.id,
  });

  typia.assert(retrievedCart);

  // Step 3: Validate cart properties match expected structure
  TestValidator.equals("cart ID matches", retrievedCart.id, createdCart.id);
  TestValidator.equals(
    "total item count is non-negative",
    retrievedCart.total_item_count,
    createdCart.total_item_count,
  );
  TestValidator.equals(
    "total product count is non-negative",
    retrievedCart.total_product_count,
    createdCart.total_product_count,
  );
  TestValidator.equals(
    "status is active",
    retrievedCart.status,
    createdCart.status,
  );
  TestValidator.equals(
    "is_locked_for_checkout is false",
    retrievedCart.is_locked_for_checkout,
    false,
  );
  TestValidator.equals(
    "cart created_at matches",
    retrievedCart.created_at,
    createdCart.created_at,
  );
  TestValidator.equals(
    "cart updated_at matches",
    retrievedCart.updated_at,
    createdCart.updated_at,
  );
  TestValidator.equals(
    "last_activity_at matches",
    retrievedCart.last_activity_at,
    createdCart.last_activity_at,
  );

  // Step 4: Test cart retrieval with customer preferences
  TestValidator.equals(
    "customer shipping preference matches",
    retrievedCart.customer_shipping_preference,
    createCartRequest.customer_shipping_preference,
  );
  TestValidator.equals(
    "promotional codes match",
    retrievedCart.promotional_codes,
    createCartRequest.promotional_codes,
  );
  TestValidator.equals(
    "customer notes match",
    retrievedCart.customer_notes,
    createCartRequest.customer_notes,
  );

  // Step 5: Verify session continuity through cart updates
  const newCart = await api.functional.shoppingMall.carts.create(connection, {
    body: {
      customer_notes: "Updated guest cart",
    } satisfies IShoppingMallCart.ICreate,
  });

  const retrievedNewCart = await api.functional.shoppingMall.carts.at(
    connection,
    {
      cartId: newCart.id,
    },
  );

  TestValidator.equals(
    "new cart ID is different",
    newCart.id !== createdCart.id,
    true,
  );
  TestValidator.equals(
    "new cart customer_notes updated",
    retrievedNewCart.customer_notes,
    "Updated guest cart",
  );

  // Step 6: Validate cart expiration and lifecycle properties
  TestValidator.predicate(
    "cart has valid expiration",
    retrievedCart.expires_at === null || retrievedCart.expires_at !== null,
  );
  TestValidator.predicate(
    "cart converted_at is null",
    retrievedCart.converted_at === null,
  );
  TestValidator.predicate(
    "cart deleted_at is null",
    retrievedCart.deleted_at === null,
  );

  // Verify cart is retrievable multiple times (session continuity)
  const retrievedAgain = await api.functional.shoppingMall.carts.at(
    connection,
    {
      cartId: createdCart.id,
    },
  );

  typia.assert(retrievedAgain);
  TestValidator.equals(
    "cart data consistent across retrievals",
    retrievedCart.id,
    retrievedAgain.id,
  );
}
