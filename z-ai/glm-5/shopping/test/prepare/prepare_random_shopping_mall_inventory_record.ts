import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate>,
): IShoppingMallInventoryRecord.ICreate {
  return {
    quantity_change:
      input?.quantity_change ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1000000>
          >()
        : typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<-1000000> &
              tags.Maximum<-1>
          >()),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
  };
}
