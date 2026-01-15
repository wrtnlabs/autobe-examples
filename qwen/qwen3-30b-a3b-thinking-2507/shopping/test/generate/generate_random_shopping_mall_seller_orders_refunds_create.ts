import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_order_refund } from "../prepare/prepare_random_shopping_mall_order_refund";
export async function generate_random_shopping_mall_seller_orders_refunds_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderRefund.ICreate> | undefined;
    params: {
      orderCode: string;
    };
  },
): Promise<IShoppingMallOrderRefund> {
  const prepared: IShoppingMallOrderRefund.ICreate =
    prepare_random_shopping_mall_order_refund(props.body);
  return await api.functional.shoppingMall.seller.orders.refunds.create(
    connection,
    {
      body: prepared,
      orderCode: props.params.orderCode,
    },
  );
}
