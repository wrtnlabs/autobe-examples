import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_inventory_history(
  input?: DeepPartial<IShoppingMallInventoryHistory.ICreate>,
): IShoppingMallInventoryHistory.ICreate {
  return {
    shoppingMallProductVariantId:
      input?.shoppingMallProductVariantId ??
      typia.random<string & tags.Format<"uuid">>(),
    quantityDelta:
      input?.quantityDelta ?? typia.random<number & tags.Type<"int32">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
