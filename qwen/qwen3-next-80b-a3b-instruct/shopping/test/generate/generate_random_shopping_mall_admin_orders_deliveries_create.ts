import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { prepare_random_shopping_mall_order_shipment } from "../prepare/prepare_random_shopping_mall_order_shipment";
export async function generate_random_shopping_mall_admin_orders_deliveries_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderShipment.ICreate> | undefined;
    params: {
      orderCode: string;
    };
  },
): Promise<IShoppingMallOrderShipment> {
  const prepared: IShoppingMallOrderShipment.ICreate =
    prepare_random_shopping_mall_order_shipment(props.body);
  return await api.functional.shoppingMall.admin.orders.deliveries.create(
    connection,
    {
      body: prepared,
      orderCode: props.params.orderCode,
    },
  );
}
