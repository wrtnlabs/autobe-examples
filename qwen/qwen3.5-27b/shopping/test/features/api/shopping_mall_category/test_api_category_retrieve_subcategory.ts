import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_subcategory(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a subcategory with parent relationship.
   *
   * This test validates the hierarchical category structure by retrieving
   * a subcategory and verifying that:
   * 1. The category response includes all required fields
   * 2. The parent field is non-null (indicating a subcategory)
   * 3. The parent field contains a valid IShoppingMallCategory.ISummary
   * 4. The subcategories array is present (empty or with children)
   * 5. The hierarchical relationship is correctly represented
   *
   * Note: This test assumes pre-existing test data with category hierarchy.
   */
  // Create actor-specific connection (connection isolation pattern)
  const customerConnection: api.IConnection = { host: connection.host };
  // Use a test category ID (assumes pre-existing subcategory in test database)
  // In real testing, this would be a known test fixture ID
  const subcategoryId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // Retrieve the subcategory
  const category = await api.functional.shoppingMall.categories.at(
    customerConnection,
    {
      categoryId: subcategoryId,
    },
  );
  // Validate the response type
  typia.assert(category);
  // Verify the category has a parent (non-null indicates subcategory)
  TestValidator.predicate(
    "subcategory has parent category",
    category.parent !== null,
  );
  // Verify parent relationship - parent should have valid data
  if (category.parent !== null && category.parent !== undefined) {
    // Parent should have required fields
    TestValidator.predicate(
      "parent has valid id",
      category.parent.id.length > 0,
    );
    TestValidator.predicate(
      "parent has non-empty name",
      category.parent.name.length > 0,
    );
    TestValidator.predicate(
      "parent has created_at timestamp",
      category.parent.created_at.length > 0,
    );
    // Parent's parent should be null (top-level category in 2-level hierarchy)
    TestValidator.equals(
      "parent is top-level category (no grandparent)",
      category.parent.parent,
      null,
    );
  }
  // Verify subcategories array exists and is properly typed
  TestValidator.predicate(
    "subcategories is an array",
    Array.isArray(category.subcategories),
  );
  // Verify category has required fields with valid values
  TestValidator.predicate("category has valid id", category.id.length > 0);
  TestValidator.predicate(
    "category has non-empty name",
    category.name.length > 0,
  );
  TestValidator.predicate(
    "category has created_at timestamp",
    category.created_at.length > 0,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    category.updated_at.length > 0,
  );
  // Verify the hierarchical relationship
  // The category's id should match the parent's id in the parent field
  if (category.parent !== null && category.parent !== undefined) {
    TestValidator.predicate(
      "category parent reference is valid",
      category.parent.id !== category.id,
    );
  }
}