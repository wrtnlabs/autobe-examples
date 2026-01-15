import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { prepare_random_shopping_mall_order_item } from "../prepare/prepare_random_shopping_mall_order_item";
export async function generate_random_shopping_mall_customer_orders_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderItem.ICreate> | undefined;
    params: {
      orderCode: string;
    };
  },
): Promise<IShoppingMallOrderItem> {
  const prepared: IShoppingMallOrderItem.ICreate =
    prepare_random_shopping_mall_order_item(props.body);
  return await api.functional.shoppingMall.customer.orders.items.create(
    connection,
    {
      body: prepared,
      orderCode: props.params.orderCode,
    },
  );
}
