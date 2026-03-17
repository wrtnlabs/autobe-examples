import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_payment_attempt(
  input?: DeepPartial<IShoppingMallPaymentAttempt.ICreate>,
): IShoppingMallPaymentAttempt.ICreate {
  return {
    amount:
      input?.amount ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000000>
      >(),
    gateway_provider:
      input?.gateway_provider ??
      RandomGenerator.pick([
        "stripe",
        "paypal",
        "tosspayments",
        "kakaopay",
        "naverpay",
      ] as const),
  };
}
