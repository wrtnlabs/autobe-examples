import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRateLimit";
export function prepare_random_shopping_mall_payment_rate_limit(
  input?: DeepPartial<IShoppingMallPaymentRateLimit.ICreate>,
): IShoppingMallPaymentRateLimit.ICreate {
  return {
    paymentMethod:
      input?.paymentMethod ??
      RandomGenerator.pick([
        "credit_card",
        "paypal",
        "ach",
        "crypto",
        "apple_pay",
      ] as const),
    currency:
      input?.currency ??
      RandomGenerator.pick([
        "USD",
        "EUR",
        "JPY",
        "GBP",
        "CAD",
        "AUD",
        "CHF",
      ] as const),
    region:
      input?.region ??
      RandomGenerator.pick([
        "US",
        "EU",
        "JP",
        "CA",
        "AU",
        "DE",
        "FR",
        "GLOBAL",
      ] as const),
    maxTransactions:
      input?.maxTransactions ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
      >(),
    durationSeconds:
      input?.durationSeconds ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<86400>
      >(),
    enabled: input?.enabled ?? RandomGenerator.pick([true, false] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
  };
}
