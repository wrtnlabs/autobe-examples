import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_erase_clears_inventory_warning_when_responsible_line_removed(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberTokenConnection: api.IConnection = { host: connection.host };
  memberTokenConnection.headers ??= {};
  memberTokenConnection.headers.Authorization = member.token.access;
  // 2) create cart
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberTokenConnection,
    {},
  );
  typia.assert(cart);
  // 3) add two cart items using prepared valid variant IDs
  // We expect that at least one of these quantities can trigger the warning.
  // Strategy: create one low-quantity item and one high-quantity item, then
  // re-fetch cart and select the line that makes the warning present.
  const lowItem = await generate_random_shopping_mall_member_carts_items_create(
    memberTokenConnection,
    {
      params: { cartId: cart.id },
      body: typia.assert<IShoppingMallCartItem.ICreate>({
        shoppingMallProductVariantId:
          typia.random<IShoppingMallCartItem.ICreate["shoppingMallProductVariantId"]>(),
        quantity: 1,
      }),
    },
  );
  typia.assert(lowItem);
  const highItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberTokenConnection,
      {
        params: { cartId: cart.id },
        body: typia.assert<IShoppingMallCartItem.ICreate>({
          shoppingMallProductVariantId:
            typia.random<IShoppingMallCartItem.ICreate["shoppingMallProductVariantId"]>(),
          quantity: 1000,
        }),
      },
    );
  typia.assert(highItem);
  // 4) verify warning present
  const cartWithWarning = await api.functional.shoppingMall.member.carts.at(
    memberTokenConnection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(cartWithWarning);
  // If warning is not present due to environment/inventory semantics, refresh by
  // adding another high quantity item and re-check.
  if (cartWithWarning.warning_inventory_insufficient !== true) {
    const extraHighItem =
      await generate_random_shopping_mall_member_carts_items_create(
        memberTokenConnection,
        {
          params: { cartId: cart.id },
          body: typia.assert<IShoppingMallCartItem.ICreate>({
            shoppingMallProductVariantId:
              typia.random<IShoppingMallCartItem.ICreate["shoppingMallProductVariantId"]>(),
            quantity: 2000,
          }),
        },
      );
    typia.assert(extraHighItem);
    const cartWithWarning2 = await api.functional.shoppingMall.member.carts.at(
      memberTokenConnection,
      { cartId: cart.id },
    );
    typia.assert(cartWithWarning2);
    TestValidator.equals(
      "inventory warning should be present before erase",
      cartWithWarning2.warning_inventory_insufficient,
      true,
    );
    // Determine responsible item to erase (prefer extraHighItem)
    await api.functional.shoppingMall.member.carts.items.erase(
      memberTokenConnection,
      {
        cartId: cart.id,
        cartItemId: extraHighItem.id,
      },
    );
    const cartAfterErase = await api.functional.shoppingMall.member.carts.at(
      memberTokenConnection,
      {
        cartId: cart.id,
      },
    );
    typia.assert(cartAfterErase);
    TestValidator.equals(
      "inventory warning should be cleared after erase",
      cartAfterErase.warning_inventory_insufficient,
      false,
    );
    return;
  }
  TestValidator.equals(
    "inventory warning should be present before erase",
    cartWithWarning.warning_inventory_insufficient,
    true,
  );
  // 5) erase responsible line: attempt to erase highItem first
  await api.functional.shoppingMall.member.carts.items.erase(
    memberTokenConnection,
    {
      cartId: cart.id,
      cartItemId: highItem.id,
    },
  );
  // 6) verify warning cleared
  const cartAfterErase1 = await api.functional.shoppingMall.member.carts.at(
    memberTokenConnection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(cartAfterErase1);
  if (cartAfterErase1.warning_inventory_insufficient === true) {
    // If warning is still present, then the low item must be the responsible one.
    await api.functional.shoppingMall.member.carts.items.erase(
      memberTokenConnection,
      {
        cartId: cart.id,
        cartItemId: lowItem.id,
      },
    );
    const cartAfterErase2 = await api.functional.shoppingMall.member.carts.at(
      memberTokenConnection,
      { cartId: cart.id },
    );
    typia.assert(cartAfterErase2);
    TestValidator.equals(
      "inventory warning should be cleared after erase",
      cartAfterErase2.warning_inventory_insufficient,
      false,
    );
    return;
  }
  TestValidator.equals(
    "inventory warning should be cleared after erase",
    cartAfterErase1.warning_inventory_insufficient,
    false,
  );
}
