import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
export function prepare_random_shopping_mall_order_refund(
  input?: DeepPartial<IShoppingMallOrderRefund.ICreate>,
): IShoppingMallOrderRefund.ICreate {
  return {
    amount:
      input?.amount ??
      typia.random<number & tags.Minimum<0.01> & tags.Maximum<999999>>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<4>
        >(),
        wordMin: 3,
        wordMax: 10,
      }),
  };
}
