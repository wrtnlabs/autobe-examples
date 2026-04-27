import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall category creation data for E2E testing.
 *
 * Generates a complete IECommerceMallCategory.ICreate with randomized values.
 * The function produces a category with a short descriptive name and an
 * explanatory description. By default, categories are top-level (parent_id is
 * null), but a parent category UUID can be provided to create subcategories.
 *
 * @param input Optional partial input to override specific fields
 * @returns A fully populated IECommerceMallCategory.ICreate suitable for API requests
 */
export function prepare_random_ecommerce_mall_category(
  input?: DeepPartial<IECommerceMallCategory.ICreate>,
): IECommerceMallCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 1 }),
    parent_id: input?.parent_id !== undefined ? input.parent_id : null,
  };
}
