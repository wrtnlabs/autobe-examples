import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category search functionality using the search query parameter to filter
 * categories by name.
 *
 * This test validates that the category search API correctly filters results
 * based on the search parameter, supporting partial name matching and
 * case-insensitive queries.
 *
 * Test workflow:
 *
 * 1. Search with empty/undefined query to get all categories baseline
 * 2. Search with partial name match to verify substring filtering works
 * 3. Search with different casing to verify case-insensitive behavior
 * 4. Validate that only matching categories are returned in results
 */
export async function test_api_category_search_by_name(
  connection: api.IConnection,
) {
  // Test 1: Search with undefined search parameter (should return all categories)
  const allCategoriesResult =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(allCategoriesResult);

  // Verify we have categories to test with
  TestValidator.predicate(
    "should have categories available for testing",
    allCategoriesResult.data.length > 0,
  );

  // Test 2: Pick a random category and search with partial name
  const randomCategory = RandomGenerator.pick(allCategoriesResult.data);
  const searchTerm = randomCategory.name.substring(
    0,
    Math.max(2, Math.floor(randomCategory.name.length / 2)),
  );

  const partialSearchResult =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: searchTerm,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(partialSearchResult);

  // Validate partial match works
  TestValidator.predicate(
    "partial search should return at least one result",
    partialSearchResult.data.length > 0,
  );

  // Verify all returned categories contain the search term (case-insensitive)
  const allMatchPartialSearch = partialSearchResult.data.every((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  TestValidator.predicate(
    "all results should contain the search term in their name",
    allMatchPartialSearch,
  );

  // Test 3: Case-insensitive search with uppercase
  const uppercaseSearchResult =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: searchTerm.toUpperCase(),
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(uppercaseSearchResult);

  // Verify case-insensitive behavior - results should be the same
  TestValidator.equals(
    "case-insensitive search should return same results",
    partialSearchResult.data.map((c) => c.id).sort(),
    uppercaseSearchResult.data.map((c) => c.id).sort(),
  );

  // Test 4: Search with exact full name
  const exactSearchResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        search: randomCategory.name,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(exactSearchResult);

  // Should find at least the original category
  const foundOriginal = exactSearchResult.data.some(
    (category) => category.id === randomCategory.id,
  );
  TestValidator.predicate(
    "exact name search should find the original category",
    foundOriginal,
  );

  // Test 5: Search with non-existent term
  const nonExistentTerm = RandomGenerator.alphaNumeric(20) + "_nonexistent_xyz";
  const emptySearchResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        search: nonExistentTerm,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptySearchResult);

  // Should return no results
  TestValidator.equals(
    "search with non-existent term should return empty results",
    emptySearchResult.data.length,
    0,
  );
}
