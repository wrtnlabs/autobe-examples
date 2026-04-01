import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category tree browsing with hierarchy structure.
 *
 * This test validates the GET /shoppingMall/categories/tree endpoint which returns
 * the complete category hierarchy for customer browsing. The test verifies:
 * 1. Response structure conforms to IShoppingMallCategory.ITree type
 * 2. Top-level categories have parent_id as null
 * 3. Subcategories are nested within parent's children array
 * 4. Subcategories have empty children arrays (two-level hierarchy only)
 * 5. All required fields (id, parent_id, name, description, children) are present
 */
export async function test_api_category_tree_browsing_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve the complete category tree
  const categoryTree: IShoppingMallCategory.ITree =
    await api.functional.shoppingMall.categories.tree(connection);
  // Validate response type structure - this validates all fields exist with correct types
  typia.assert(categoryTree);
  // Validate top-level category structure (parent_id should be null for root category)
  TestValidator.predicate(
    "top-level category has null parent_id",
    categoryTree.parent_id === null,
  );
  // Validate subcategories if they exist
  if (categoryTree.children.length > 0) {
    for (const subcategory of categoryTree.children) {
      // Validate subcategory type structure
      typia.assert(subcategory);
      // Subcategory should have parent_id set to top-level category's id (business logic)
      TestValidator.equals(
        "subcategory parent_id matches top-level category id",
        subcategory.parent_id,
        categoryTree.id,
      );
      // Subcategory should have empty children array (two-level hierarchy per business rules)
      TestValidator.equals(
        "subcategory has empty children array",
        subcategory.children,
        [],
      );
    }
  }
}
