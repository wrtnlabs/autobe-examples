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
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    parent_id:
      input?.parent_id ??
      (Math.random() < 0.3
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
  };
}
