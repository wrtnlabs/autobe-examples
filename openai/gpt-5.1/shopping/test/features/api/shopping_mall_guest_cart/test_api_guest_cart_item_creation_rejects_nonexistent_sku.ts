import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

export async function test_api_guest_cart_item_creation_rejects_nonexistent_sku(
  connection: api.IConnection,
) {
  // 1. Create a fresh guest cart for an unauthenticated visitor
  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: typia.random<IShoppingMallGuestCart.ICreate>(),
    });
  typia.assert(guestCart);

  // 2. Construct an obviously non-existent SKU identifier
  const nonexistentSkuId: string = `nonexistent-sku-${RandomGenerator.alphaNumeric(24)}`;

  // 3. Prepare a valid IShoppingMallGuestCartItem.ICreate body with bogus sku_id
  const invalidItemBody = {
    sku_id: nonexistentSkuId,
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  // 4. Attempt to create a guest cart item with the invalid SKU and expect error
  await TestValidator.error(
    "adding guest cart item with nonexistent sku_id must fail",
    async () => {
      await api.functional.shoppingMall.guestCarts.items.create(connection, {
        guestCartId: guestCart.id,
        body: invalidItemBody,
      });
    },
  );
}
