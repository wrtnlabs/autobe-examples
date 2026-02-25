import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cart } from "../prepare/prepare_random_shopping_mall_cart";

export async function generate_random_shopping_mall_customer_cart_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCart.ICreate>;
  },
): Promise<IShoppingMallCartItem> {
  const prepared: IShoppingMallCart.ICreate = prepare_random_shopping_mall_cart(
    props.body,
  );
  const result: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart.create(connection, {
      body: prepared,
    });
  return result;
}
