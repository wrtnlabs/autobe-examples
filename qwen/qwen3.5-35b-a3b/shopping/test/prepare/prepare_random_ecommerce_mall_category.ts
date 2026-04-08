import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product category creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallCategory.ICreate with randomized
 * category data. Categories support one-level hierarchy with optional
 * parent references for subcategories.
 *
 * @param input Optional partial data to override random generation
 * @returns Complete category creation DTO with all fields populated
 */
export function prepare_random_ecommerce_mall_category(
  input?: DeepPartial<IEcommerceMallCategory.ICreate>,
): IEcommerceMallCategory.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
    parent_id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
    sort_order:
      input?.sort_order ?? typia.random<number & tags.Type<"int32">>(),
  };
}
