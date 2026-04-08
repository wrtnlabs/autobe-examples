import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall category creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCategory.ICreate with randomized values.
 * Categories organize products for customer browsing and filtering. Top-level
 * categories have no parent, while subcategories reference a parent_category_id.
 * The system enforces a one-level nesting structure.
 *
 * @param input - Optional partial override for specific properties
 * @returns Complete IShoppingMallCategory.ICreate instance
 */
export function prepare_random_shopping_mall_category(
  input?: DeepPartial<IShoppingMallCategory.ICreate> | undefined,
): IShoppingMallCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id:
      input?.parent_category_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
