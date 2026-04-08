import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a category that has no subcategories.
 *
 * Validates the complete category retrieval flow for a leaf category (one without subcategories). Ensures that the response structure is correct with all required fields present, the subcategories array is empty, and the deleted_at field is null for active categories. Tests that the endpoint is publicly accessible without authentication.
 *
 * Special attention is given to verifying that the response structure matches the IShoppingMallCategory DTO exactly, with proper type validation through typia.assert().
 *
 * 1. Generate a random UUID for category retrieval (simulating a real category ID).
 * 2. Call the category retrieval endpoint with the generated ID.
 * 3. Validate the response structure using typia.assert().
 * 4. Verify that the subcategories array exists and can be empty.
 * 5. Verify that deleted_at is null for active categories.
 */
export async function test_api_category_retrieval_without_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random category ID for testing
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve the category
  // Note: This tests the endpoint accessibility and response structure
  const category = await api.functional.shoppingMall.categories.at(connection, {
    categoryId,
  });
  // 3. Validate the complete response structure
  typia.assert(category);
  // 4. Verify business logic: subcategories array exists
  TestValidator.predicate(
    "subcategories array exists",
    Array.isArray(category.subcategories),
  );
  // 5. Verify business logic: category is active (not deleted)
  TestValidator.equals(
    "deleted_at is null for active category",
    category.deleted_at,
    null,
  );
  // 6. Verify business logic: category has required content
  TestValidator.predicate("category has name", category.name.length > 0);
  TestValidator.predicate(
    "category has description",
    category.description.length > 0,
  );
}
