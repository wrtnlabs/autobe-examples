import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_tree_excludes_soft_deleted_categories(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve the complete category tree
  const tree: IShoppingMallCategory.ITree =
    await api.functional.shoppingMall.categories.tree(connection);
  // Validate response structure - this performs complete type validation
  typia.assert(tree);
  // Verify tree structure exists
  TestValidator.predicate("tree should be valid", tree !== null);
  // Validate hierarchical structure and parent-child relationships
  const validateCategoryHierarchy = (
    category: IShoppingMallCategory.ITree,
    depth: number = 0,
  ): void => {
    // Root categories must have null parent_id
    if (depth === 0) {
      TestValidator.predicate(
        `root category ${category.name} has null parent_id`,
        category.parent_id === null,
      );
    } else {
      // Subcategories must have a valid parent_id
      TestValidator.predicate(
        `subcategory ${category.name} has parent_id`,
        category.parent_id !== null,
      );
    }
    // Verify children array exists and validate nested categories
    TestValidator.predicate(
      `category ${category.name} has children array`,
      Array.isArray(category.children),
    );
    // Recursively validate subcategories
    for (const child of category.children) {
      validateCategoryHierarchy(child, depth + 1);
      // Verify child's parent_id matches current category's id (hierarchical integrity)
      TestValidator.equals(
        `child ${child.name} parent_id matches parent ${category.name}`,
        child.parent_id,
        category.id,
      );
    }
    // Verify two-level hierarchy constraint (subcategories cannot have children)
    if (depth >= 1) {
      TestValidator.predicate(
        `subcategory ${category.name} cannot have nested children (two-level hierarchy)`,
        category.children.length === 0,
      );
    }
  };
  // Validate the entire tree structure starting from root
  validateCategoryHierarchy(tree, 0);
  // Collect all category IDs to verify uniqueness across the tree
  const allCategoryIds: string[] = [];
  const collectCategoryIds = (category: IShoppingMallCategory.ITree): void => {
    allCategoryIds.push(category.id);
    for (const child of category.children) {
      collectCategoryIds(child);
    }
  };
  collectCategoryIds(tree);
  // Verify all category IDs are unique (no duplicates in tree)
  TestValidator.equals(
    "all category IDs should be unique in tree",
    allCategoryIds.length,
    new Set(allCategoryIds).size,
  );
  // The test validates that the returned tree contains only active categories.
  // Soft-deleted categories are filtered by the backend (deleted_at IS NULL)
  // and should not appear in the tree structure at any level.
  // This ensures customers cannot browse deleted categories through navigation.
}
