import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import type { IShoppingMallOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnItem";
import type { IShoppingMallReturnAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnAddress";
import type { IShoppingMallReturnShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShippingMethod";
import { prepare_random_shopping_mall_order_return } from "../prepare/prepare_random_shopping_mall_order_return";
export async function generate_random_shopping_mall_customer_orders_returns_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderReturn.ICreate> | undefined;
    params: {
      orderCode: string;
    };
  },
): Promise<IShoppingMallOrderReturn> {
  const prepared: IShoppingMallOrderReturn.ICreate =
    prepare_random_shopping_mall_order_return(props.body);
  return await api.functional.shoppingMall.customer.orders.returns.create(
    connection,
    {
      body: prepared,
      orderCode: props.params.orderCode,
    },
  );
}
