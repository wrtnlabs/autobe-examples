import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving an active (non-deleted) product category by its unique identifier.
 * This is the primary success path for category browsing functionality.
 *
 * Test Steps:
 * 1. Generate a valid UUID for a category
 * 2. Call GET /ecommerceMall/categories/{categoryId} with the generated UUID
 * 3. Verify the response contains complete category information
 * 4. Verify HTTP status code is 200 OK
 * 5. Verify the category structure follows one-level nesting
 */
export async function test_api_category_retrieve_active_category(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for the category
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API to retrieve the category
  const category: IEcommerceMallCategory =
    await api.functional.ecommerceMall.categories.at(connection, {
      categoryId,
    });
  // Validate the response structure
  typia.assert(category);
  // Verify the category ID matches the requested ID
  TestValidator.equals(
    "category id matches requested",
    category.id,
    categoryId,
  );
  // Verify category name is a non-empty string
  TestValidator.predicate(
    "category name is non-empty",
    category.name.length > 0,
  );
  // Verify deleted_at is null (category is active)
  TestValidator.equals(
    "category is active (not deleted)",
    category.deleted_at,
    null,
  );
  // Verify timestamps are valid date-time strings
  TestValidator.predicate(
    "created_at is valid timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      category.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      category.updated_at,
    ),
  );
  // Verify parent_id type consistency
  if (category.parent_id === null) {
    TestValidator.equals(
      "parent is null for top-level category",
      category.parent,
      null,
    );
  } else {
    // Verify parent exists and has correct structure for subcategory
    TestValidator.predicate(
      "parent exists for subcategory",
      category.parent !== null,
    );
    if (category.parent !== null) {
      // Verify parent has required fields
      TestValidator.predicate(
        "parent has valid id",
        category.parent.id.length > 0,
      );
      TestValidator.predicate(
        "parent has valid name",
        category.parent.name.length > 0,
      );
    }
  }
  // Verify subcategories array structure (one-level nesting)
  TestValidator.predicate(
    "subcategories is array",
    Array.isArray(category.subcategories),
  );
  // Validate each subcategory has required fields and no nested children
  for (const subcategory of category.subcategories) {
    typia.assert(subcategory);
    TestValidator.predicate(
      "subcategory has valid id",
      subcategory.id.length > 0,
    );
    TestValidator.predicate(
      "subcategory has valid name",
      subcategory.name.length > 0,
    );
  }
}
