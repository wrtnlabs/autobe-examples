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

export async function test_api_cart_erase_updates_subtotal_only_for_removed_line(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(cart);
  const cartItem1 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: undefined,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: undefined,
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: undefined,
      },
    );
  typia.assert(cartItem3);
  const beforeCart = await api.functional.shoppingMall.member.carts.at(
    memberConnection,
    { cartId: cart.id },
  );
  typia.assert(beforeCart);

  const beforeItems = typia.assert(
    beforeCart as unknown as { items: IShoppingMallCartItem[] },
  ).items;

  const beforeItem1 = beforeItems.find(
    (i: IShoppingMallCartItem) => i.id === cartItem1.id,
  );
  const beforeItem2 = beforeItems.find(
    (i: IShoppingMallCartItem) => i.id === cartItem2.id,
  );
  const beforeItem3 = beforeItems.find(
    (i: IShoppingMallCartItem) => i.id === cartItem3.id,
  );
  TestValidator.predicate(
    "cart contains all 3 items before deletion",
    () =>
      beforeItem1 !== undefined &&
      beforeItem2 !== undefined &&
      beforeItem3 !== undefined,
  );

  const removedSubtotal = typia.assert(beforeItem2!).subtotalAmount;
  const beforeSubtotal = beforeItems.reduce(
    (sum: number, i: IShoppingMallCartItem) => sum + i.subtotalAmount,
    0,
  );

  await api.functional.shoppingMall.member.carts.items.erase(memberConnection, {
    cartId: cart.id,
    cartItemId: cartItem2.id,
  });

  const afterCart = await api.functional.shoppingMall.member.carts.at(
    memberConnection,
    { cartId: cart.id },
  );
  typia.assert(afterCart);

  const afterItems = typia.assert(
    afterCart as unknown as { items: IShoppingMallCartItem[] },
  ).items;

  TestValidator.predicate(
    "deleted cart item removed from cart listing",
    () => afterItems.every((i: IShoppingMallCartItem) => i.id !== cartItem2.id),
  );

  const afterItem1 = afterItems.find(
    (i: IShoppingMallCartItem) => i.id === cartItem1.id,
  );
  const afterItem3 = afterItems.find(
    (i: IShoppingMallCartItem) => i.id === cartItem3.id,
  );
  TestValidator.predicate(
    "remaining items still exist after deletion",
    () => afterItem1 !== undefined && afterItem3 !== undefined,
  );
  TestValidator.equals(
    "quantity for item1 unchanged",
    typia.assert(afterItem1!).quantity,
    typia.assert(beforeItem1!).quantity,
  );
  TestValidator.equals(
    "quantity for item3 unchanged",
    typia.assert(afterItem3!).quantity,
    typia.assert(beforeItem3!).quantity,
  );

  const afterSubtotal = afterItems.reduce(
    (sum: number, i: IShoppingMallCartItem) => sum + i.subtotalAmount,
    0,
  );
  TestValidator.equals(
    "cart subtotal reduced by removed line contribution",
    afterSubtotal,
    beforeSubtotal - removedSubtotal,
  );
  TestValidator.equals(
    "cart inventory warning flag remains consistent after deletion",
    afterCart.warning_inventory_insufficient,
    beforeCart.warning_inventory_insufficient,
  );
  await TestValidator.error(
    "deleted cart item cannot be retrieved",
    async () => {
      await api.functional.shoppingMall.member.carts.items.at(
        memberConnection,
        { cartId: cart.id, cartItemId: cartItem2.id },
      );
    },
  );
}
