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
 * Test category search functionality by name using text search filter.
 *
 * Validates the category search feature including partial matching, case-insensitive search, pagination support, and empty result handling. Ensures that the search correctly filters categories by name and returns properly structured results with parent category references.
 *
 * Special attention is given to verifying that partial string matching works correctly (LIKE operator behavior), case-insensitive matching returns expected results, and empty search results return valid pagination metadata with zero records.
 *
 * 1. Search with partial category name and verify matching results.
 * 2. Test case-insensitive search by using different case variations.
 * 3. Verify pagination parameters work correctly with search.
 * 4. Test search with non-matching term to verify empty result handling.
 * 5. Validate category structure includes parent references correctly.
 */
export async function test_api_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search with partial category name
  const searchResults = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        search: "elect",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(searchResults);
  // 2. Verify matching categories contain search term (case-insensitive)
  if (searchResults.data.length > 0) {
    for (const category of searchResults.data) {
      TestValidator.predicate(
        "category name contains search term",
        category.name.toLowerCase().includes("elect"),
      );
    }
  }
  // 3. Test case-insensitive search with uppercase
  const uppercaseResults = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        search: "ELECT",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(uppercaseResults);
  // 4. Verify case-insensitive results match
  TestValidator.equals(
    "case-insensitive search returns same count",
    searchResults.pagination.records,
    uppercaseResults.pagination.records,
  );
  // 5. Test with pagination parameters
  const paginatedResults = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        search: "elect",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(paginatedResults);
  TestValidator.equals("limit respected", paginatedResults.pagination.limit, 5);
  TestValidator.predicate(
    "data length within limit",
    paginatedResults.data.length <= 5,
  );
  // 6. Test empty search results with non-matching term
  const emptyResults = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        search: "xyznonexistent123",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty search returns zero records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data",
    emptyResults.data.length,
    0,
  );
}
