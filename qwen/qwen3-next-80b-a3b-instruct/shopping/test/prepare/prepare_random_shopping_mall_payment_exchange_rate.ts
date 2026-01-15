import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentExchangeRate";
export function prepare_random_shopping_mall_payment_exchange_rate(
  input?: DeepPartial<IShoppingMallPaymentExchangeRate.ICreate>,
): IShoppingMallPaymentExchangeRate.ICreate {
  return {
    base_currency:
      input?.base_currency ??
      RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "JPY",
        "GBP",
        "CAD",
        "AUD",
        "CHF",
        "CNY",
        "INR",
      ] as const),
    target_currency:
      input?.target_currency ??
      (() => {
        const currencies = [
          "USD",
          "EUR",
          "KRW",
          "JPY",
          "GBP",
          "CAD",
          "AUD",
          "CHF",
          "CNY",
          "INR",
        ] as const;
        const base = input?.base_currency ?? RandomGenerator.pick(currencies);
        return RandomGenerator.pick(currencies.filter((c) => c !== base));
      })(),
    rate:
      input?.rate ??
      typia.random<number & tags.Type<"float"> & tags.Minimum<0.01>>(),
  };
}
