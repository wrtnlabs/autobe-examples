import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce category creation data for E2E testing.
 *
 * Generates a complete IEcommerceCategory.ICreate with randomized values.
 * Supports both root categories (parent_id = null) and subcategories
 * (parent_id = UUID) for testing hierarchical category structures.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IEcommerceCategory.ICreate object with all required fields
 */
export function prepare_random_ecommerce_category(
  input?: DeepPartial<IEcommerceCategory.ICreate> | undefined,
): IEcommerceCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    parent_id:
      input?.parent_id ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
