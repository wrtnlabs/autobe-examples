import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_tree_empty_or_single_level_structure(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve the category tree structure
  const category: IShoppingMallCategory.ITree =
    await api.functional.shoppingMall.categories.tree(connection);
  // Validate response structure
  typia.assert(category);
  // Test case 1: Empty category tree (no root category or no children)
  if (!category.id || category.children.length === 0) {
    TestValidator.equals("empty category tree", category.children, []);
  } else {
    // Test case 2: Single-level categories (no subcategories)
    // Each top-level category should have empty children array
    for (const child of category.children) {
      // Validate that children have proper parent_id reference
      TestValidator.equals(
        "child category parent_id matches root",
        child.parent_id,
        category.id,
      );
      // Validate that children array is empty (no subcategories)
      TestValidator.equals(
        "category has no subcategories",
        child.children,
        [],
      );
    }
  }
}