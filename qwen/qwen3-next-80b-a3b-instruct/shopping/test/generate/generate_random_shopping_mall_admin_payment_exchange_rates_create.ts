import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentExchangeRate";
import { prepare_random_shopping_mall_payment_exchange_rate } from "../prepare/prepare_random_shopping_mall_payment_exchange_rate";
export async function generate_random_shopping_mall_admin_payment_exchange_rates_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentExchangeRate.ICreate>;
  },
): Promise<IShoppingMallPaymentExchangeRate> {
  const prepared: IShoppingMallPaymentExchangeRate.ICreate =
    prepare_random_shopping_mall_payment_exchange_rate(props.body);
  const result: IShoppingMallPaymentExchangeRate =
    await api.functional.shoppingMall.admin.payment_exchange_rates.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
