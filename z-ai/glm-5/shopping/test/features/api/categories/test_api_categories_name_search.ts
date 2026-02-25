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
 * Test name-based category search with case-insensitive partial matching.
 *
 * Validates:
 * 1. Partial name search returns matching categories
 * 2. Case-insensitivity (uppercase, lowercase, mixed case)
 * 3. Partial matching (substring search)
 * 4. Combined name search with parentId filter
 * 5. Combined name search with pagination
 * 6. Non-matching name returns empty results
 */
export async function test_api_categories_name_search(
  connection: api.IConnection,
): Promise<void> {
  // First, get all categories to have reference data for search testing
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // Test 1: Partial name match search
  if (allCategories.data.length > 0) {
    const sampleCategory = RandomGenerator.pick(allCategories.data);
    // Search with lowercase version of the name
    const searchTerm = sampleCategory.name.toLowerCase();
    const lowerCaseResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: { name: searchTerm } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(lowerCaseResult);
    // Verify the sample category is found
    TestValidator.predicate(
      "partial name search returns matching category",
      lowerCaseResult.data.some(
        (c) => c.name.toLowerCase() === sampleCategory.name.toLowerCase(),
      ),
    );
    // Test 2: Case-insensitivity - search with uppercase
    const upperSearch = sampleCategory.name.toUpperCase();
    const upperCaseResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: { name: upperSearch } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(upperCaseResult);
    // Verify same results for different cases
    TestValidator.equals(
      "case-insensitive search returns same results",
      lowerCaseResult.data.map((c) => c.id).sort(),
      upperCaseResult.data.map((c) => c.id).sort(),
    );
    // Test 3: Mixed case search
    const mixedCaseSearch =
      sampleCategory.name.charAt(0).toUpperCase() +
      sampleCategory.name.slice(1).toLowerCase();
    const mixedCaseResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          name: mixedCaseSearch,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(mixedCaseResult);
    TestValidator.equals(
      "mixed case search returns same results",
      lowerCaseResult.data.map((c) => c.id).sort(),
      mixedCaseResult.data.map((c) => c.id).sort(),
    );
    // Test 4: Partial substring match
    if (sampleCategory.name.length >= 3) {
      const partialName = sampleCategory.name.substring(0, 3);
      const partialResult = await api.functional.shoppingMall.categories.index(
        connection,
        {
          body: { name: partialName } satisfies IShoppingMallCategory.IRequest,
        },
      );
      typia.assert(partialResult);
      // Verify partial match includes the sample category
      TestValidator.predicate(
        "partial substring search returns matching category",
        partialResult.data.some((c) =>
          c.name.toLowerCase().includes(partialName.toLowerCase()),
        ),
      );
    }
    // Test 5: Combined name search with parentId filter
    if (sampleCategory.parentId !== null) {
      const combinedResult = await api.functional.shoppingMall.categories.index(
        connection,
        {
          body: {
            name: sampleCategory.name,
            parentId: sampleCategory.parentId,
          } satisfies IShoppingMallCategory.IRequest,
        },
      );
      typia.assert(combinedResult);
      // Verify all results have the correct parentId
      TestValidator.predicate(
        "combined search with parentId filters correctly",
        combinedResult.data.every(
          (c) => c.parentId === sampleCategory.parentId,
        ),
      );
    }
    // Test 6: Name search with pagination
    const paginatedResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          name: searchTerm,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(paginatedResult);
    TestValidator.predicate(
      "pagination limit is respected",
      paginatedResult.data.length <= 5,
    );
    TestValidator.equals(
      "current page is 1",
      paginatedResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit matches request",
      paginatedResult.pagination.limit,
      5,
    );
  }
  // Test 7: Non-matching name returns empty results
  const nonMatchingName = `xyznonexistent${RandomGenerator.alphabets(10)}`;
  const emptyResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: { name: nonMatchingName } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-matching name returns empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching name returns zero records",
    emptyResult.pagination.records,
    0,
  );
}
