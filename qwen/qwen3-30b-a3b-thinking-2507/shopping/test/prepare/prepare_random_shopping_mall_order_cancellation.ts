import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
export function prepare_random_shopping_mall_order_cancellation(
  input?: DeepPartial<IShoppingMallOrderCancellation.ICreate>,
): IShoppingMallOrderCancellation.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>>(),
      }),
  };
}