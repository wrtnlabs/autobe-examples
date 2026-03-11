import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_category(
  input?: DeepPartial<IShoppingMallCategory.ICreate>,
): IShoppingMallCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description: input?.description ?? null,
    parent_id: input?.parent_id ?? null,
  };
}
