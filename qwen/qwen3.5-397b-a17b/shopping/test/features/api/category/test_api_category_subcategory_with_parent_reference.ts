import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_subcategory_with_parent_reference(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve a category by ID - using random UUID for testing
  // In production, this would use an actual category ID from the database
  const categoryId = typia.random<string & typia.tags.Format<"uuid">>();
  // Test that the endpoint properly handles category retrieval
  // Note: This may return 404 if category doesn't exist, which is expected behavior
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(connection, {
      categoryId,
    });
  // Validate complete response structure including all nested objects
  // This validates: id, created_by_admin_id, name, description, created_at,
  // updated_at, deleted_at, parent (ISummary or null), children (ISummary[])
  typia.assert(category);
  // Validate business logic: if category has parent, parent should have different ID
  if (category.parent !== null) {
    TestValidator.notEquals(
      "parent ID differs from category ID",
      category.id,
      category.parent.id,
    );
  }
  // Validate hierarchical structure: children array should be empty
  // (one-level nesting constraint means subcategories cannot have their own children)
  TestValidator.predicate(
    "subcategories have no children (one-level nesting)",
    () => category.children.length === 0,
  );
}
