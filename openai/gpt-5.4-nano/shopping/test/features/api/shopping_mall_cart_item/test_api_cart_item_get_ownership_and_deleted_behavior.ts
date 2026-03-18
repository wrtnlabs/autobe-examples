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

export async function test_api_cart_item_get_ownership_and_deleted_behavior(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  const memberACart = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(memberACart);
  const memberACartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberAConnection,
      {
        params: { cartId: memberACart.id },
      },
    );
  typia.assert(memberACartItem);
  const memberAGet = await api.functional.shoppingMall.member.carts.items.at(
    memberAConnection,
    {
      cartId: memberACart.id,
      cartItemId: memberACartItem.id,
    },
  );
  typia.assert(memberAGet);
  TestValidator.equals(
    "cart item cart id matches",
    memberAGet.shoppingMallCartId,
    memberACartItem.shoppingMallCartId,
  );
  TestValidator.equals(
    "cart item id matches",
    memberAGet.id,
    memberACartItem.id,
  );
  TestValidator.equals(
    "subtotal amount matches stored line subtotal",
    memberAGet.subtotalAmount,
    memberACartItem.subtotalAmount,
  );
  TestValidator.predicate(
    "createdAt is not after updatedAt",
    new Date(memberAGet.createdAt).getTime() <=
      new Date(memberAGet.updatedAt).getTime(),
  );
  TestValidator.equals(
    "deletedAt is null for active item",
    memberAGet.deletedAt,
    null,
  );
  // Scenario 2: ownership enforcement
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  const memberBCart = await generate_random_shopping_mall_member_carts_create(
    memberBConnection,
    {},
  );
  typia.assert(memberBCart);
  const memberBCartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberBConnection,
      {
        params: { cartId: memberBCart.id },
      },
    );
  typia.assert(memberBCartItem);
  await TestValidator.httpError(
    "member B cannot read member A cart item",
    404,
    async () => {
      await api.functional.shoppingMall.member.carts.items.at(
        memberBConnection,
        {
          cartId: memberACart.id,
          cartItemId: memberACartItem.id,
        },
      );
    },
  );
  const memberBGet = await api.functional.shoppingMall.member.carts.items.at(
    memberBConnection,
    {
      cartId: memberBCart.id,
      cartItemId: memberBCartItem.id,
    },
  );
  typia.assert(memberBGet);
  TestValidator.equals(
    "member B reads own cart item",
    memberBGet.id,
    memberBCartItem.id,
  );
  TestValidator.equals(
    "member B subtotal matches stored line subtotal",
    memberBGet.subtotalAmount,
    memberBCartItem.subtotalAmount,
  );
  TestValidator.equals(
    "member B deletedAt is null",
    memberBGet.deletedAt,
    null,
  );
  // Scenario 3: soft-deleted item behaves like not found
  await api.functional.shoppingMall.member.carts.items.erase(
    memberAConnection,
    {
      cartId: memberACart.id,
      cartItemId: memberACartItem.id,
    },
  );
  await TestValidator.httpError(
    "member A cannot read soft-deleted cart item",
    404,
    async () => {
      await api.functional.shoppingMall.member.carts.items.at(
        memberAConnection,
        {
          cartId: memberACart.id,
          cartItemId: memberACartItem.id,
        },
      );
    },
  );
}
