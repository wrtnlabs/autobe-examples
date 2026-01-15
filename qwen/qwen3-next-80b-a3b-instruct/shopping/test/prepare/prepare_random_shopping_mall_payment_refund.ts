import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
export function prepare_random_shopping_mall_payment_refund(
  input?: DeepPartial<IShoppingMallPaymentRefund.ICreate> | undefined,
): IShoppingMallPaymentRefund.ICreate {
  return {
    amount:
      input?.amount ??
      typia.random<number & tags.Minimum<0.1> & tags.Maximum<999999>>(),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "item_not_as_described",
        "wrong_item_received",
        "damaged_item",
        "duplicate_payment",
        "customer_requested",
        "other",
      ] as const),
    comments:
      input?.comments ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
  };
}
