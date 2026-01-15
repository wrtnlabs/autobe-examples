import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
export function prepare_random_shopping_mall_payment_dispute(
  input?: DeepPartial<IShoppingMallPaymentDispute.ICreate>,
): IShoppingMallPaymentDispute.ICreate {
  return {
    payment_id:
      input?.payment_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<7>
        >(),
        wordMin: 4,
        wordMax: 10,
      }),
    dispute_type:
      input?.dispute_type ??
      RandomGenerator.pick([
        "double_charge",
        "incorrect_amount",
        "invalid_service",
        "item_not_received",
        "item_different_than_described",
      ] as const),
  };
}
