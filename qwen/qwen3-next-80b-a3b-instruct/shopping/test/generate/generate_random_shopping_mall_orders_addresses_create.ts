import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { prepare_random_shopping_mall_order_address } from "../prepare/prepare_random_shopping_mall_order_address";
export async function generate_random_shopping_mall_orders_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderAddress.ICreate> | undefined;
    params: {
      orderCode: string;
    };
  },
): Promise<IShoppingMallOrderAddress> {
  const prepared: IShoppingMallOrderAddress.ICreate =
    prepare_random_shopping_mall_order_address(props.body);
  return await api.functional.shoppingMall.orders.addresses.create(connection, {
    body: prepared,
    orderCode: props.params.orderCode,
  });
}
