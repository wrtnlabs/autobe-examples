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
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
        wordMin: 3,
        wordMax: 8,
      }),
    parentId:
      input?.parentId !== undefined
        ? input.parentId
        : RandomGenerator.pick([
            null,
            typia.random<string & tags.Format<"uuid">>(),
          ] as const),
  };
}
