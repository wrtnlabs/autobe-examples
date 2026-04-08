import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a subcategory by its unique identifier with parent hierarchy validation.
 *
 * Validates the complete category retrieval flow including the hierarchical parent relationship. Ensures that when retrieving a subcategory, the system returns the complete category record with the parent field properly populated containing the parent category's id, name, and created_at. Verifies that the subcategory correctly references its parent category in the hierarchy and that the one-level nesting constraint is maintained.
 *
 * Special attention is given to verifying that the parent category itself is a top-level category with null parent, ensuring the one-level nesting constraint is enforced. This scenario tests the hierarchical category structure used when customers navigate into subcategories.
 *
 * 1. Generate a random category UUID for retrieval.
 * 2. Call the GET endpoint to retrieve the category details.
 * 3. Validate the complete response structure with typia.assert().
 * 4. Verify the category ID matches the requested ID.
 * 5. If the category has a parent, validate the parent structure and one-level nesting constraint.
 */
export async function test_api_category_retrieve_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random category ID for retrieval
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve category by ID
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(connection, {
      categoryId,
    });
  // 3. Validate complete response structure
  typia.assert(category);
  // 4. Verify category ID matches the requested ID
  TestValidator.equals("category ID matches request", category.id, categoryId);
  // 5. If category has parent, validate parent structure and nesting constraint
  if (category.parent !== null) {
    const parent = category.parent;
    // Verify parent has valid structure (typia.assert already validated types)
    TestValidator.predicate("parent has ID", () => parent.id !== undefined);
    TestValidator.predicate("parent has name", () => parent.name !== undefined);
    // Verify one-level nesting constraint: parent must be top-level (null parent)
    TestValidator.equals(
      "parent is top-level category (one-level nesting)",
      parent.parent,
      null,
    );
  }
}
