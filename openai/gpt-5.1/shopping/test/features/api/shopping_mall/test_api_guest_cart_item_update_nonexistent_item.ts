import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate that updating a non-existent guest cart item fails.
 *
 * Business goal
 *
 * - Ensure that PUT
 *   /shoppingMall/guestCarts/{guestCartId}/items/{guestCartItemId} enforces
 *   existence of the target item within the given cart, and does not silently
 *   create or upsert items when given an invalid item ID.
 *
 * High-level flow
 *
 * 1. Create a guest cart for an anonymous visitor.
 * 2. Optionally add a single valid item to the cart so that the cart is active and
 *    the negative scenario is clearly about a non-existent item ID, not an
 *    empty cart.
 * 3. Generate a random UUID string that is different from the real item.id.
 * 4. Call the update API with the valid cart ID but the non-existent item ID and a
 *    valid quantity payload.
 * 5. Assert that the update API throws an error using TestValidator.error, without
 *    depending on a specific HTTP status code or message.
 */
export async function test_api_guest_cart_item_update_nonexistent_item(
  connection: api.IConnection,
) {
  // 1. Create a guest cart for an anonymous visitor
  const cartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(32),
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    referrer: "https://example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const cart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallGuestCart>(cart);

  // 2. Optionally add a real item so the cart is active / non-empty.
  //    SKU and quantity are arbitrary but valid.
  const itemCreateBody = {
    sku_id: RandomGenerator.alphaNumeric(16),
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const realItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: cart.id,
      body: itemCreateBody,
    });
  typia.assert<IShoppingMallGuestCartItem>(realItem);

  // 3. Generate a UUID that is guaranteed to differ from the real item id.
  const nonExistentItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure we do not accidentally pick the existing id; if so, regenerate once.
  const effectiveNonExistentItemId: string & tags.Format<"uuid"> =
    nonExistentItemId === realItem.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonExistentItemId;

  // 4-5. Attempt to update using the non-existent item ID and expect an error.
  const updateBody = {
    quantity: 2,
  } satisfies IShoppingMallGuestCartItem.IUpdate;

  await TestValidator.error(
    "update with non-existent guest cart item id fails",
    async () => {
      await api.functional.shoppingMall.guestCarts.items.update(connection, {
        guestCartId: cart.id,
        guestCartItemId: effectiveNonExistentItemId,
        body: updateBody,
      });
    },
  );
}
