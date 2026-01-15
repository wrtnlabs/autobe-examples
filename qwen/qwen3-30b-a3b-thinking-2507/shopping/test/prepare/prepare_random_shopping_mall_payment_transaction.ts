import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
export function prepare_random_shopping_mall_payment_transaction(
  input?: DeepPartial<IShoppingMallPaymentTransaction.ICreate> | undefined,
): IShoppingMallPaymentTransaction.ICreate {
  return {
    order_id: typia.random<string & tags.Format<"uuid">>(),
    amount: input?.amount ?? typia.random<number & tags.Minimum<0>>(),
    gateway_reference:
      input?.gateway_reference ?? RandomGenerator.alphaNumeric(32),
    transaction_status:
      input?.transaction_status ??
      RandomGenerator.pick([
        "pending",
        "completed",
        "failed",
        "refunded",
      ] as const),
    currency:
      input?.currency ?? typia.random<string & tags.Pattern<"^[a-z]{3}$">>(),
  };
}
