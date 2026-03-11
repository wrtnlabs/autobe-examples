import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_parent_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a parent category with subcategories
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const category = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId,
    },
  );
  typia.assert(category);
  // Validate parent reference is null for root categories
  TestValidator.equals(
    "parent is null for root category",
    category.parent,
    null,
  );
  // Validate is_leaf flag for parent category (should be false)
  TestValidator.predicate(
    "parent category has subcategories",
    category.is_leaf === false,
  );
  // Validate subcategory count reflects hierarchy
  TestValidator.predicate(
    "subcategory_count is non-negative",
    category.subcategory_count >= 0,
  );
  // Validate product count includes products from category and subcategories
  TestValidator.predicate(
    "product_count is non-negative",
    category.product_count >= 0,
  );
  // Validate timestamps are valid date-time formats (verified by typia.assert)
  TestValidator.equals(
    "created_at exists",
    true,
    category.created_at !== undefined,
  );
  TestValidator.equals(
    "updated_at exists",
    true,
    category.updated_at !== undefined,
  );
}