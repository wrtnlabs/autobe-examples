import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustment";
export function prepare_random_shopping_mall_inventory_adjustment(
  input?: DeepPartial<IShoppingMallInventoryAdjustment.ICreate>,
): IShoppingMallInventoryAdjustment.ICreate {
  return {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    adjustment_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<-9999> & tags.Maximum<9999>
    >(),
    reason: RandomGenerator.paragraph({
      sentences: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
      >(),
    }),
  };
}
