import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_inventory_record(
  input?: DeepPartial<IShoppingMallProductInventoryRecord.ICreate>,
): IShoppingMallProductInventoryRecord.ICreate {
  return {
    quantity_change:
      input?.quantity_change ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<-1000> &
          tags.Maximum<1000> &
          tags.ExclusiveMinimum<0>
      >(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
  };
}
