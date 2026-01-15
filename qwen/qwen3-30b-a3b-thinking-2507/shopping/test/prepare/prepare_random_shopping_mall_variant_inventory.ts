import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantInventory";
export function prepare_random_shopping_mall_variant_inventory(
  input?: DeepPartial<IShoppingMallVariantInventory.ICreate>,
): IShoppingMallVariantInventory.ICreate {
  return {};
}
