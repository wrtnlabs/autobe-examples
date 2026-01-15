import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
export function prepare_random_shopping_mall_payment_method(
  input?: DeepPartial<IShoppingMallPaymentMethod.ICreate>,
): IShoppingMallPaymentMethod.ICreate {
  return {
    provider:
      input?.provider ??
      RandomGenerator.pick(["stripe", "paypal", "razorpay"] as const),
    enabled: input?.enabled ?? RandomGenerator.pick([true, false] as const),
  };
}
