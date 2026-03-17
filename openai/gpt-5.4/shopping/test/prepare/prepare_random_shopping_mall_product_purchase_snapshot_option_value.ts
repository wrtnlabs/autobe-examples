import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_purchase_snapshot_option_value(
  input?: DeepPartial<IShoppingMallProductPurchaseSnapshotOptionValue.ICreate>,
): IShoppingMallProductPurchaseSnapshotOptionValue.ICreate {
  return {
    option_name:
      input?.option_name ??
      RandomGenerator.pick([
        "Color",
        "Size",
        "Material",
        "Style",
        "Length",
      ] as const),
    option_value:
      input?.option_value ??
      RandomGenerator.pick([
        "Red",
        "Blue",
        "Black",
        "Large",
        "Medium",
        "Cotton",
        "Slim",
        "Long",
      ] as const),
    display_order:
      input?.display_order ?? typia.random<number & tags.Type<"int32">>(),
  };
}
