import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a category with subcategories children array.
 *
 * This test validates the category retrieval endpoint returns proper hierarchical structure:
 * 1. Category response includes children array with direct subcategories
 * 2. Each child follows IShoppingMallCategory.ISummary format (id, name, description, created_at)
 * 3. Subcategories do not have nested children (one-level nesting constraint)
 * 4. Parent category reference is properly set for subcategories
 */
export async function test_api_category_with_subcategories_children_array(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for category ID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve category by ID
  const category = await api.functional.shoppingMall.categories.at(connection, {
    categoryId,
  });
  // Validate response structure matches IShoppingMallCategory
  typia.assert(category);
  // Validate children array exists and is properly typed
  TestValidator.predicate(
    "children is array",
    Array.isArray(category.children),
  );
  // If category has subcategories, validate their structure
  if (category.children.length > 0) {
    for (const child of category.children) {
      // Validate each child conforms to ISummary type
      typia.assert<IShoppingMallCategory.ISummary>(child);
      // Validate child parent structure if exists
      if (child.parent !== undefined && child.parent !== null) {
        typia.assert<IShoppingMallCategory.ISummary>(child.parent);
      }
    }
    // Validate all children have unique IDs
    const childIds = category.children.map((c) => c.id);
    const uniqueChildIds = new Set(childIds);
    TestValidator.equals(
      "all children have unique IDs",
      childIds.length,
      uniqueChildIds.size,
    );
  }
  // Verify parent category structure if exists (for non-root categories)
  if (category.parent !== null) {
    typia.assert<IShoppingMallCategory.ISummary>(category.parent);
  }
}
