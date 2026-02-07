import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cart } from "../prepare/prepare_random_shopping_mall_cart";

export async function generate_random_shopping_mall_customer_items_to_cart_add_to_cart(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCart.ICreate> | undefined;
  },
): Promise<IShoppingMallCart> {
  const prepared: IShoppingMallCart.ICreate = prepare_random_shopping_mall_cart(
    props.body,
  );
  return await api.functional.shoppingMall.customer.items_to_cart.addToCart(
    connection,
    {
      body: prepared,
    },
  );
}
