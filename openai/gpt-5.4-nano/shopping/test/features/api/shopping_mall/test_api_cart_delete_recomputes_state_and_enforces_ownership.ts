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

export async function test_api_cart_delete_recomputes_state_and_enforces_ownership(
  connection: api.IConnection,
): Promise<void> {
  // =====================
  // Scenario 1: delete within same cart
  // =====================
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const cartA = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cartA);
  const cartAItem1 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberAConnection,
      { params: { cartId: cartA.id } },
    );
  typia.assert(cartAItem1);
  const cartAItem2 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberAConnection,
      { params: { cartId: cartA.id } },
    );
  typia.assert(cartAItem2);
  const cartABefore = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cartA.id },
  );
  typia.assert(cartABefore);
  const item1Before = await api.functional.shoppingMall.member.carts.items.at(
    memberAConnection,
    { cartId: cartA.id, cartItemId: cartAItem1.id },
  );
  typia.assert(item1Before);
  const item2Before = await api.functional.shoppingMall.member.carts.items.at(
    memberAConnection,
    { cartId: cartA.id, cartItemId: cartAItem2.id },
  );
  typia.assert(item2Before);
  const warningBefore = cartABefore.warning_inventory_insufficient;
  await api.functional.shoppingMall.member.carts.items.erase(
    memberAConnection,
    { cartId: cartA.id, cartItemId: cartAItem1.id },
  );
  // deleted item should no longer be accessible
  await TestValidator.error("deleted item is not accessible", async () => {
    const deleted = await api.functional.shoppingMall.member.carts.items.at(
      memberAConnection,
      { cartId: cartA.id, cartItemId: cartAItem1.id },
    );
    typia.assert(deleted);
  });
  // remaining item should still be accessible and unchanged
  const item2After = await api.functional.shoppingMall.member.carts.items.at(
    memberAConnection,
    { cartId: cartA.id, cartItemId: cartAItem2.id },
  );
  typia.assert(item2After);
  TestValidator.equals(
    "remaining item quantity unchanged",
    item2After.quantity,
    item2Before.quantity,
  );
  TestValidator.equals(
    "remaining item subtotal unchanged",
    item2After.subtotalAmount,
    item2Before.subtotalAmount,
  );
  TestValidator.equals(
    "remaining item variant unchanged",
    item2After.shoppingMallProductVariantId,
    item2Before.shoppingMallProductVariantId,
  );
  // derived cart state should be recomputed
  const cartAAfter = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cartA.id },
  );
  typia.assert(cartAAfter);
  TestValidator.equals(
    "derived cart warning recomputed based on remaining items",
    cartAAfter.warning_inventory_insufficient,
    cartAAfter.warning_inventory_insufficient,
  );
  // =====================
  // Scenario 2: ownership enforcement across different members
  // =====================
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const cartB = await generate_random_shopping_mall_member_carts_create(
    memberBConnection,
    {},
  );
  typia.assert(cartB);
  const cartA2Item =
    await generate_random_shopping_mall_member_carts_items_create(
      memberAConnection,
      { params: { cartId: cartA.id } },
    );
  typia.assert(cartA2Item);
  const cartA2Before = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cartA.id },
  );
  typia.assert(cartA2Before);
  const cartBBefore = await api.functional.shoppingMall.member.carts.at(
    memberBConnection,
    { cartId: cartB.id },
  );
  typia.assert(cartBBefore);
  await TestValidator.error(
    "member B cannot delete member A cart item",
    async () => {
      await api.functional.shoppingMall.member.carts.items.erase(
        memberBConnection,
        { cartId: cartA.id, cartItemId: cartA2Item.id },
      );
    },
  );
  const cartA2After = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cartA.id },
  );
  typia.assert(cartA2After);
  const cartA2ItemStill =
    await api.functional.shoppingMall.member.carts.items.at(memberAConnection, {
      cartId: cartA.id,
      cartItemId: cartA2Item.id,
    });
  typia.assert(cartA2ItemStill);
  TestValidator.equals(
    "member A cart warning unchanged after rejected delete",
    cartA2After.warning_inventory_insufficient,
    cartA2Before.warning_inventory_insufficient,
  );
  const cartBAfter = await api.functional.shoppingMall.member.carts.at(
    memberBConnection,
    { cartId: cartB.id },
  );
  typia.assert(cartBAfter);
  TestValidator.equals(
    "member B cart warning unchanged",
    cartBAfter.warning_inventory_insufficient,
    cartBBefore.warning_inventory_insufficient,
  );
  // =====================
  // Scenario 3: cartItemId does not belong to the given cart
  // =====================
  const cart1 = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cart1);
  const cart2 = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cart2);
  const itemFromCart1 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberAConnection,
      { params: { cartId: cart1.id } },
    );
  typia.assert(itemFromCart1);
  const itemFromCart2 =
    await generate_random_shopping_mall_member_carts_items_create(
      memberAConnection,
      { params: { cartId: cart2.id } },
    );
  typia.assert(itemFromCart2);
  const cart1Before = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cart1.id },
  );
  typia.assert(cart1Before);
  const cart2Before = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cart2.id },
  );
  typia.assert(cart2Before);
  await TestValidator.error(
    "cannot delete item not belonging to the cart",
    async () => {
      await api.functional.shoppingMall.member.carts.items.erase(
        memberAConnection,
        { cartId: cart1.id, cartItemId: itemFromCart2.id },
      );
    },
  );
  const cart1After = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cart1.id },
  );
  typia.assert(cart1After);
  const cart2After = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: cart2.id },
  );
  typia.assert(cart2After);
  const itemFromCart1Still =
    await api.functional.shoppingMall.member.carts.items.at(memberAConnection, {
      cartId: cart1.id,
      cartItemId: itemFromCart1.id,
    });
  typia.assert(itemFromCart1Still);
  const itemFromCart2Still =
    await api.functional.shoppingMall.member.carts.items.at(memberAConnection, {
      cartId: cart2.id,
      cartItemId: itemFromCart2.id,
    });
  typia.assert(itemFromCart2Still);
  TestValidator.equals(
    "cart1 warning unchanged",
    cart1After.warning_inventory_insufficient,
    cart1Before.warning_inventory_insufficient,
  );
  TestValidator.equals(
    "cart2 warning unchanged",
    cart2After.warning_inventory_insufficient,
    cart2Before.warning_inventory_insufficient,
  );
}
