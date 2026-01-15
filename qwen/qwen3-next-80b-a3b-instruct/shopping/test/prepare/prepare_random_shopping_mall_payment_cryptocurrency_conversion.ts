import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCryptocurrencyConversion";
export function prepare_random_shopping_mall_payment_cryptocurrency_conversion(
  input?: DeepPartial<IShoppingMallPaymentCryptocurrencyConversion.ICreate>,
): IShoppingMallPaymentCryptocurrencyConversion.ICreate {
  return {
    // Test-customizable field: source currency (ISO 4217)
    sourceCurrency:
      input?.sourceCurrency ??
      RandomGenerator.pick([
        "USD",
        "EUR",
        "JPY",
        "GBP",
        "CAD",
        "AUD",
        "CHF",
        "CNY",
        "INR",
        "MXN",
      ] as const),
    // Auto-generated field: crypto currency code (3-5 uppercase letters)
    targetCryptoCurrency:
      input?.targetCryptoCurrency ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
        >(),
      ),
    // Auto-generated field: amount (positive number)
    amount:
      input?.amount ??
      typia.random<number & tags.Type<"float"> & tags.Minimum<1>>(),
    // Auto-generated field: payment method ID (UUID format)
    paymentMethodId:
      input?.paymentMethodId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
