import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sales_order_item } from "../prepare/prepare_random_shopping_mall_sales_order_item";

export async function generate_random_shopping_mall_admin_orders_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSalesOrderItem.ICreate>;
    params?: {
      orderId: string;
    };
  },
): Promise<IShoppingMallSalesOrderItem> {
  const prepared: IShoppingMallSalesOrderItem.ICreate =
    prepare_random_shopping_mall_sales_order_item(props.body);
  return await api.functional.shoppingMall.admin.orders.items.create(
    connection,
    {
      body: prepared,
      orderId: props.params?.orderId ?? typia.random<string & tags.Format<"uuid">>(),
    },
  );
}