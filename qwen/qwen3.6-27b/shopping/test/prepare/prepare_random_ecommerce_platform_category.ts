import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform category creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformCategory.ICreate with randomized values
 * for testing the category creation endpoint. Categories can be root categories
 * (no parent) or subcategories with one level of nesting.
 *
 * Default behavior generates root categories (parentEcommercePlatformCategoryId = null).
 * Use the input parameter to customize specific properties or create subcategory
 * test scenarios by providing a parent UUID.
 */
export function prepare_random_ecommerce_platform_category(
  input?: DeepPartial<IEcommercePlatformCategory.ICreate>,
): IEcommercePlatformCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    parentEcommercePlatformCategoryId:
      input?.parentEcommercePlatformCategoryId ?? null,
  };
}
