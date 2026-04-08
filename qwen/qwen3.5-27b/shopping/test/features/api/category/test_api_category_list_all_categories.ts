import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing all available product categories on the platform.
 *
 * Validates the public category listing endpoint that returns a paginated list of all non-deleted categories. This test ensures that categories are returned with complete information including hierarchical parent relationships, and that soft-deleted categories are properly excluded from results.
 *
 * The test verifies pagination metadata accuracy, category field completeness, and the correct handling of parent category references (null for top-level categories, ISummary for subcategories).
 *
 * 1. Calls the public endpoint with an empty request body to retrieve all categories
 * 2. Validates the response structure and pagination metadata
 * 3. Verifies each category has all required fields and valid parent relationships
 * 4. Confirms that all returned categories have deleted_at set to null
 */
export async function test_api_category_list_all_categories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call the public endpoint to list all categories
  const output = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(output);
  // 2. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // 3. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(output.data));
  // 4. Validate each category in the response
  await ArrayUtil.asyncForEach(output.data, async (category) => {
    // Validate required fields exist
    TestValidator.predicate(
      `category has valid UUID: ${category.id}`,
      typeof category.id === "string" && category.id.length > 0,
    );
    TestValidator.predicate(
      `category has name: ${category.name}`,
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      `category has description: ${category.description}`,
      typeof category.description === "string",
    );
    TestValidator.predicate(
      `category has created_at: ${category.created_at}`,
      typeof category.created_at === "string",
    );
    TestValidator.predicate(
      `category has updated_at: ${category.updated_at}`,
      typeof category.updated_at === "string",
    );
    // Validate parentCategory is either null or a valid ISummary
    if (category.parentCategory === null) {
      TestValidator.predicate(
        `top-level category has null parent: ${category.name}`,
        category.parentCategory === null,
      );
    } else {
      TestValidator.predicate(
        `subcategory has valid parent: ${category.name}`,
        typeof category.parentCategory.id === "string" &&
          typeof category.parentCategory.name === "string",
      );
    }
    // Validate deleted_at is null (soft-deleted categories should be excluded)
    TestValidator.equals(
      `category is not deleted: ${category.name}`,
      category.deleted_at,
      null,
    );
  });
}
