import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
export function prepare_random_shopping_mall_order_return(
  input?: DeepPartial<IShoppingMallOrderReturn.ICreate> | undefined,
): IShoppingMallOrderReturn.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "defective",
        "wrong_item",
        "changed_mind",
        "late_delivery",
        "other",
      ] as const),
  };
}
