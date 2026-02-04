import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate>,
): IShoppingMallInventoryRecord.ICreate {
  return {
    variantId: input?.variantId ?? typia.random<string & tags.Format<"uuid">>(),
    quantityChange:
      input?.quantityChange ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-20> & tags.Maximum<100>
      >(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    sourceType:
      input?.sourceType ??
      RandomGenerator.pick(["restock", "adjustment"] as const),
  };
}
