import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_category(
  input?: DeepPartial<IShoppingMallCategory.ICreate> | undefined,
): IShoppingMallCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }) ?? null,
    parent_category_id:
      input?.parent_category_id ??
      typia.random<string & tags.Format<"uuid">>() ??
      null,
  };
}
