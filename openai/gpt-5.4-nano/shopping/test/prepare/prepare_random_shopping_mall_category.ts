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
    parent_category_id:
      input?.parent_category_id ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uuid">>(),
      ] as const),
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 2,
        wordMin: 3,
        wordMax: 8,
      }),
    slug:
      input?.slug ??
      `${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(6)}`,
    visibility:
      input?.visibility ??
      RandomGenerator.pick(["active", "hidden", "archived"] as const),
    display_order:
      input?.display_order ?? typia.random<number & tags.Type<"int32">>(),
  };
}
