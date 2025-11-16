import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate that a guest cart item cannot be updated using a different guest
 * cart's ID.
 *
 * Business purpose:
 *
 * - Ensure that each IShoppingMallGuestCartItem is strongly scoped to its owning
 *   guest cart, and that the update endpoint enforces this association.
 * - Prevent cross-cart tampering where an attacker who learns a valid
 *   guestCartItemId from Cart A attempts to update it through Cart B's path.
 *
 * Scenario steps:
 *
 * 1. Create Cart A via POST /shoppingMall/guestCarts and record its id.
 * 2. Create Cart B via POST /shoppingMall/guestCarts and record its id.
 * 3. Create a cart item under Cart A via POST
 *    /shoppingMall/guestCarts/{guestCartId}/items and capture the created
 *    item's id and initial quantity.
 * 4. Attempt to update that item using PUT
 *    /shoppingMall/guestCarts/{guestCartId_B}/items/{guestCartItemId_A} with a
 *    valid IShoppingMallGuestCartItem.IUpdate body (e.g., quantity change).
 *    This is the intentional cross-cart mismatch.
 * 5. Assert that this mismatched-cart update call fails using TestValidator.error.
 *    Do not assert specific HTTP status codes.
 * 6. Perform a legitimate update using Cart A's id and the same item id to confirm
 *    that normal in-cart updates still succeed.
 * 7. Compare quantities before and after the legitimate update to show that only
 *    the valid in-cart update changed the item.
 */
export async function test_api_guest_cart_item_update_with_mismatched_cart_and_item(
  connection: api.IConnection,
) {
  // 1. Create Cart A
  const cartABody = typia.random<IShoppingMallGuestCart.ICreate>();
  const cartA: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: cartABody,
    });
  typia.assert<IShoppingMallGuestCart>(cartA);

  // 2. Create Cart B
  const cartBBody = typia.random<IShoppingMallGuestCart.ICreate>();
  const cartB: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: cartBBody,
    });
  typia.assert<IShoppingMallGuestCart>(cartB);

  // 3. Create a cart item under Cart A
  const createItemBody = typia.random<IShoppingMallGuestCartItem.ICreate>();
  const itemA: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: cartA.id,
      body: createItemBody,
    });
  typia.assert<IShoppingMallGuestCartItem>(itemA);

  const originalQuantity: number = itemA.quantity;

  // Prepare an update payload that changes quantity for the tampering attempt
  const tamperUpdateBody = {
    quantity: originalQuantity + 1,
  } satisfies IShoppingMallGuestCartItem.IUpdate;

  // 4. Attempt mismatched-cart update: Cart B id with Cart A's item id
  await TestValidator.error("cross-cart update must be rejected", async () => {
    await api.functional.shoppingMall.guestCarts.items.update(connection, {
      guestCartId: cartB.id,
      guestCartItemId: itemA.id,
      body: tamperUpdateBody,
    });
  });

  // 6. Perform a legitimate update using Cart A's id
  const legitimateUpdateBody = {
    quantity: originalQuantity + 2,
  } satisfies IShoppingMallGuestCartItem.IUpdate;

  const updatedItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.update(connection, {
      guestCartId: cartA.id,
      guestCartItemId: itemA.id,
      body: legitimateUpdateBody,
    });
  typia.assert<IShoppingMallGuestCartItem>(updatedItem);

  // 7. Compare quantities to ensure only legitimate update took effect
  TestValidator.equals(
    "legitimate update should apply new quantity",
    updatedItem.quantity,
    legitimateUpdateBody.quantity,
  );
}
