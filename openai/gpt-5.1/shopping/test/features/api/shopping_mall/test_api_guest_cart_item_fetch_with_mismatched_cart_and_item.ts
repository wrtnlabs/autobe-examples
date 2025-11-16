import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

export async function test_api_guest_cart_item_fetch_with_mismatched_cart_and_item(
  connection: api.IConnection,
) {
  // 1. Create two independent guest carts: Cart A and Cart B.
  const cartABody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.1",
    user_agent: "Mozilla/5.0 (E2E Test Cart A)",
    referrer: "https://example.com/landing-a",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const cartA: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: cartABody,
    });
  typia.assert(cartA);

  const cartBBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.2",
    user_agent: "Mozilla/5.0 (E2E Test Cart B)",
    referrer: "https://example.com/landing-b",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const cartB: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: cartBBody,
    });
  typia.assert(cartB);

  // 2. Under Cart A, create a legitimate guest cart item.
  const itemCreateBody = {
    sku_id: RandomGenerator.alphaNumeric(12),
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const itemA: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: cartA.id,
      body: itemCreateBody,
    });
  typia.assert(itemA);

  // Verify that the created item belongs to Cart A.
  TestValidator.equals(
    "created item should belong to Cart A",
    itemA.guest_cart_id,
    cartA.id,
  );

  // 3. Positive control: fetch the item with matching cart and item IDs.
  const fetchedSame: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.at(connection, {
      guestCartId: cartA.id,
      guestCartItemId: itemA.id,
    });
  typia.assert(fetchedSame);

  TestValidator.equals(
    "fetched item with matching cart and item IDs should equal created item",
    fetchedSame,
    itemA,
  );

  // 4. Negative scenario: attempt to fetch Cart A's item through Cart B.
  await TestValidator.error(
    "fetching Cart A item with Cart B id should fail",
    async () => {
      await api.functional.shoppingMall.guestCarts.items.at(connection, {
        guestCartId: cartB.id,
        guestCartItemId: itemA.id,
      });
    },
  );
}
