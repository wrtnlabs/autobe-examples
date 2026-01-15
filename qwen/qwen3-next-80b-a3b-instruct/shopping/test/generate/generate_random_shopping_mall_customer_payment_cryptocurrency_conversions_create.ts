import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCryptocurrencyConversion";
import { prepare_random_shopping_mall_payment_cryptocurrency_conversion } from "../prepare/prepare_random_shopping_mall_payment_cryptocurrency_conversion";
export async function generate_random_shopping_mall_customer_payment_cryptocurrency_conversions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentCryptocurrencyConversion.ICreate>;
  },
): Promise<IShoppingMallPaymentCryptocurrencyConversion> {
  const prepared: IShoppingMallPaymentCryptocurrencyConversion.ICreate =
    prepare_random_shopping_mall_payment_cryptocurrency_conversion(props.body);
  const result: IShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.customer.payment_cryptocurrency_conversions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
