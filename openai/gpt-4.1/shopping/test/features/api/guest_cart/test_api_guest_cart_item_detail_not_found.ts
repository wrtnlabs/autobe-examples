import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

/**
 * Validate lookup failure for non-existent guest cart item.
 *
 * This test ensures that attempting to fetch a cart item with a valid cart but
 * non-existent itemId will be handled gracefully and will not disclose
 * unrelated cart data or sensitive information. It performs the following
 * steps:
 *
 * 1. Creates a new guestCartId (random UUID).
 * 2. Adds a valid item to the cart using POST
 *    /shopping/guestCarts/{guestCartId}/items.
 * 3. Attempts to retrieve a cart item with a valid guestCartId but a random
 *    (unused) itemId via GET
 *    /shopping/guestCarts/{guestCartId}/items/{itemId}.
 * 4. Expects an error to be returned, confirming the item does not exist & no
 *    sensitive data is leaked.
 */
export async function test_api_guest_cart_item_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Create a new guest cart ID
  const guestCartId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Add a real item to the cart
  const itemCreate = {
    shopping_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingGuestCartItem.ICreate;
  const item: IShoppingGuestCartItem =
    await api.functional.shopping.guestCarts.items.create(connection, {
      guestCartId,
      body: itemCreate,
    });
  typia.assert(item);

  // 3. Attempt to retrieve an itemId that does NOT exist in this cart
  let invalidItemId = typia.random<string & tags.Format<"uuid">>();
  // Ensure it's different from the real item's ID
  while (invalidItemId === item.id) {
    invalidItemId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Validate that retrieval fails and no unrelated data is disclosed
  await TestValidator.error(
    "Requesting a non-existent guest cart item returns error",
    async () => {
      await api.functional.shopping.guestCarts.items.at(connection, {
        guestCartId,
        itemId: invalidItemId,
      });
    },
  );
}
