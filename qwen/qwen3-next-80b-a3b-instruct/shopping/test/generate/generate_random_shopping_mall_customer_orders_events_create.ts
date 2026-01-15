import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEvent";
import type { IShoppingMallOrderEventMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEventMetadata";
import { prepare_random_shopping_mall_order_event } from "../prepare/prepare_random_shopping_mall_order_event";
export async function generate_random_shopping_mall_customer_orders_events_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderEvent.ICreate> | undefined;
    params: {
      orderCode: string;
    };
  },
): Promise<IShoppingMallOrderEvent> {
  const prepared: IShoppingMallOrderEvent.ICreate =
    prepare_random_shopping_mall_order_event(props.body);
  return await api.functional.shoppingMall.customer.orders.events.create(
    connection,
    {
      body: prepared,
      orderCode: props.params.orderCode,
    },
  );
}
