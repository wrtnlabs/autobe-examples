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

export async function test_api_cart_warnings_refresh_clears_exceed_stock_after_quantity_within_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});

  // 2) Create cart for member
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {},
  );
  typia.assert(cart);

  // 3) Add cart item with quantity likely to exceed current stock.
  // We retry with a different quantity if refresh doesn't surface the exceed-stock warning.
  const quantities = [
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2> & tags.Maximum<20>
    >(),
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<21> & tags.Maximum<40>
    >(),
  ] as const;

  let cartItem: IShoppingMallCartItem | undefined;
  let refreshed1: IShoppingMallCart.ISummary | undefined;

  for (const quantity of quantities) {
    cartItem = await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cart.id },
        body: {
          quantity,
        },
      },
    );
    typia.assert(cartItem);

    refreshed1 =
      await api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings(
        memberConnection,
        {
          body: {
            // Avoid excess-property compile errors by sending an empty items list.
            items: [],
          },
        },
      );

    typia.assert(refreshed1);
    if (refreshed1.warning_inventory_insufficient) break;
  }

  if (!cartItem || !refreshed1) {
    throw new Error("Failed to create cart item for exceed-stock test.");
  }

  TestValidator.predicate(
    "cart should have inventory insufficient warning after adding exceeding quantity",
    refreshed1.warning_inventory_insufficient === true,
  );

  // 4) Update quantity down to within stock (at least 1).
  const updatedQuantity = Math.max(1, cartItem.quantity - 1);
  const updatedItem =
    await api.functional.shoppingMall.member.carts.items.updateCartItem(
      memberConnection,
      {
        cartId: cart.id,
        cartItemId: cartItem.id,
        body: {
          quantity: updatedQuantity satisfies
            | (number & tags.Type<"int32"> & tags.Minimum<1>)
            | undefined,
        },
      },
    );
  typia.assert(updatedItem);

  // 5) Refresh again and validate warnings cleared.
  const refreshed2 =
    await api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings(
      memberConnection,
      {
        body: {
          items: [],
        },
      },
    );
  typia.assert(refreshed2);

  TestValidator.equals(
    "cart warning should be cleared after reducing quantity within stock",
    refreshed2.warning_inventory_insufficient,
    false,
  );
}
