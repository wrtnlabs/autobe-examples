import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import { prepare_random_shopping_mall_payment_refund } from "../prepare/prepare_random_shopping_mall_payment_refund";
export async function generate_random_shopping_mall_payment_refunds_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentRefund.ICreate>;
  },
): Promise<IShoppingMallPaymentRefund> {
  const prepared: IShoppingMallPaymentRefund.ICreate =
    prepare_random_shopping_mall_payment_refund(props.body);
  const result: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.payment_refunds.create(connection, {
      body: prepared,
    });
  return result;
}
