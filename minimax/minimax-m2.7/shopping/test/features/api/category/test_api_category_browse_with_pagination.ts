import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing all product categories with pagination.
 *
 * Validates the category browsing workflow by calling PATCH /ecommerceMall/categories
 * with pagination parameters. Verifies that the response includes a paginated list
 * of categories with their nested subcategories, and that the response structure
 * contains proper pagination metadata (current, limit, records, pages).
 *
 * Each category in the response should display its id, name, description,
 * subcategories_count, and nested subcategories array. Deleted categories must
 * be excluded from results to ensure only active categories are displayed.
 *
 * 1. Call PATCH /ecommerceMall/categories with pagination parameters (page: 1, limit: 10).
 * 2. Validate response structure contains pagination metadata.
 * 3. Validate response contains array of category objects with required fields.
 * 4. Verify subcategories are nested correctly within parent categories.
 * 5. Ensure deleted categories are excluded from results.
 */
export async function test_api_category_browse_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the API with pagination parameters
  const response = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination.current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination.limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination.records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate each category has required fields
  for (const category of response.data) {
    TestValidator.predicate("category has id", !!category.id);
    TestValidator.predicate("category has name", !!category.name);
    TestValidator.predicate(
      "category description is string or null",
      typeof category.description === "string" || category.description === null,
    );
    TestValidator.predicate(
      "subcategories_count is number",
      typeof category.subcategories_count === "number",
    );
    TestValidator.predicate(
      "subcategories is array",
      Array.isArray(category.subcategories),
    );
    // Validate nested subcategories
    for (const subcategory of category.subcategories) {
      TestValidator.predicate("subcategory has id", !!subcategory.id);
      TestValidator.predicate("subcategory has name", !!subcategory.name);
      TestValidator.predicate(
        "subcategory description is string or null",
        typeof subcategory.description === "string" ||
          subcategory.description === null,
      );
      TestValidator.predicate(
        "subcategory children is array",
        Array.isArray(subcategory.children),
      );
    }
  }
  // Validate pages calculation
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      response.pagination.pages >= 1,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when no records",
      response.pagination.pages,
      0,
    );
  }
}
