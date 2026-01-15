import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { prepare_random_shopping_mall_cart_item } from "../prepare/prepare_random_shopping_mall_cart_item";
export async function generate_random_shopping_mall_customer_carts_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCartItem.ICreate> | undefined;
    params: {
      cartId: string;
    };
  },
): Promise<IShoppingMallCartItem> {
  const prepared: IShoppingMallCartItem.ICreate =
    prepare_random_shopping_mall_cart_item(props.body);
  return await api.functional.shoppingMall.customer.carts.items.create(
    connection,
    {
      body: prepared,
      cartId: props.params.cartId,
    },
  );
}
