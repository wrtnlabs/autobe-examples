import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { prepare_random_shopping_mall_order_cancellation } from "../prepare/prepare_random_shopping_mall_order_cancellation";
export async function generate_random_shopping_mall_customer_orders_cancellations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderCancellation.ICreate>;
    params: {
      orderCode: string;
    };
  },
): Promise<IShoppingMallOrderCancellation> {
  const prepared: IShoppingMallOrderCancellation.ICreate =
    prepare_random_shopping_mall_order_cancellation(props.body);
  return await api.functional.shoppingMall.customer.orders.cancellations.create(
    connection,
    {
      orderCode: props.params.orderCode,
      body: prepared,
    },
  );
}
