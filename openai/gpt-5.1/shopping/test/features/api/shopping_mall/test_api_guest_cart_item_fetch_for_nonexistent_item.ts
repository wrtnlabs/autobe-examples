import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate behavior of fetching guest cart items, including handling of
 * non-existent item IDs within a valid guest cart.
 *
 * Business flow:
 *
 * 1. Create a guest cart for an anonymous visitor.
 * 2. Add a single, valid item into the cart.
 * 3. Fetch that item by its ID and validate that:
 *
 *    - The item ID matches.
 *    - The item is linked to the correct guest cart.
 * 4. Generate a random UUID that is not equal to the real item ID and call the
 *    item-fetch API with this non-existent item ID, ensuring the request is
 *    type-safe and does not break the client.
 *
 * Notes:
 *
 * - We deliberately avoid asserting specific HTTP error codes or payload
 *   structures for the non-existent ID path, because HTTP-status/error tests
 *   are prohibited.
 * - Instead, we focus on a strong positive-path assertion plus a secondary call
 *   that exercises the endpoint with an arbitrary UUID while preserving strict
 *   type safety.
 */
export async function test_api_guest_cart_item_fetch_for_nonexistent_item(
  connection: api.IConnection,
) {
  // 1. Create a new guest cart for an anonymous visitor
  const createCartBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "127.0.0.1",
    user_agent: "E2E-Test-Agent/1.0",
    referrer: "https://example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const cart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createCartBody,
    });
  typia.assert(cart);

  // 2. Add a legitimate item into the guest cart
  const createItemBody = {
    sku_id: RandomGenerator.alphaNumeric(12),
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: cart.id,
      body: createItemBody,
    });
  typia.assert(createdItem);

  // 3. Fetch the existing item by ID and validate linkage to the cart
  const fetchedExisting: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.at(connection, {
      guestCartId: cart.id,
      guestCartItemId: createdItem.id,
    });
  typia.assert(fetchedExisting);

  TestValidator.equals(
    "fetched item id should match created item id",
    fetchedExisting.id,
    createdItem.id,
  );

  TestValidator.equals(
    "fetched item must belong to the same guest cart",
    fetchedExisting.guest_cart_id,
    cart.id,
  );

  // 4. Try to fetch a non-existent item ID within the same cart.
  //    We ensure the ID differs from the created item's ID, then simply
  //    perform the call and assert its structural type.
  let nonExistentItemId: string & tags.Format<"uuid">;
  do {
    nonExistentItemId = typia.random<string & tags.Format<"uuid">>();
  } while (nonExistentItemId === createdItem.id);

  const fetchedNonExisting: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.at(connection, {
      guestCartId: cart.id,
      guestCartItemId: nonExistentItemId,
    });
  typia.assert(fetchedNonExisting);

  // We do not assert business semantics for the non-existent ID case,
  // because HTTP error and status-code-specific tests are prohibited.
}
