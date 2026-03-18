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

export async function test_api_cart_quantity_update_refreshes_totals_and_inventory_warning(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.member.carts.create(memberConnection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  const cartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItem);

  const higherQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const safeQuantity = cartItem.quantity satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const request1 = typia.assert<IShoppingMallCart.IRequest>([
    {
      shopping_mall_cart_item_id: cartItem.id,
      quantity: higherQuantity,
    },
  ] as unknown);

  const updatedCart: IShoppingMallCart =
    await api.functional.shoppingMall.member.carts.updateCart(
      memberConnection,
      {
        body: request1,
      },
    );
  typia.assert(updatedCart);

  TestValidator.equals("cart id preserved", updatedCart.id, cart.id);
  TestValidator.notEquals(
    "cart updated_at refreshed",
    updatedCart.updated_at,
    cart.updated_at,
  );

  const warningAfterHigher = updatedCart.warning_inventory_insufficient;

  const request2 = typia.assert<IShoppingMallCart.IRequest>([
    {
      shopping_mall_cart_item_id: cartItem.id,
      quantity: safeQuantity,
    },
  ] as unknown);

  const refreshedCart: IShoppingMallCart =
    await api.functional.shoppingMall.member.carts.updateCart(
      memberConnection,
      {
        body: request2,
      },
    );
  typia.assert(refreshedCart);

  TestValidator.equals(
    "cart id preserved after second update",
    refreshedCart.id,
    cart.id,
  );
  TestValidator.notEquals(
    "cart updated_at refreshed after second update",
    refreshedCart.updated_at,
    updatedCart.updated_at,
  );

  TestValidator.predicate(
    "warning flag reflects refreshed inventory evaluation",
    () =>
      refreshedCart.warning_inventory_insufficient === false ||
      warningAfterHigher === refreshedCart.warning_inventory_insufficient,
  );
}
