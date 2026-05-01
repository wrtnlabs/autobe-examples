import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall category creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCategory.ICreate with randomized values
 * suitable for category CRUD tests. By default, creates a top-level category
 * (parent_id is null). Tests can override parent_id with a UUID to create
 * subcategories.
 */
export function prepare_random_shopping_mall_category(
  input?: DeepPartial<IShoppingMallCategory.ICreate>,
): IShoppingMallCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    parent_id: input?.parent_id ?? null,
  };
}
