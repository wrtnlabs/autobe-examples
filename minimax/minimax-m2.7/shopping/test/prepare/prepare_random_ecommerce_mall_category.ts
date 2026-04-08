import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall category creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallCategory.ICreate with randomized values.
 * Supports both top-level categories (parent_id = null) and subcategories
 * (parent_id = valid UUID). The description field can be null to test
 * nullable database column handling.
 *
 * @param input Optional DeepPartial override for specific fields
 * @returns Complete category creation payload
 */
export function prepare_random_ecommerce_mall_category(
  input?: DeepPartial<IEcommerceMallCategory.ICreate>,
): IEcommerceMallCategory.ICreate {
  return {
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    name: input?.name ?? RandomGenerator.name(),
    parent_id: input?.parent_id ?? null,
  };
}
