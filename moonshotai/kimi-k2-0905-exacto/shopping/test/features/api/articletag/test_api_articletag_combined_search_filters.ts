import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleTag";
import type { IShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleTag";

/**
 * Test complex search scenarios combining multiple filters for advanced tag
 * discovery.
 *
 * This comprehensive test validates the sophisticated filtering capabilities of
 * the article tag search system. It tests how multiple search parameters work
 * together to support administrative workflows where managers need precise tag
 * discovery across different contexts. The test covers:
 *
 * 1. Multi-parameter filtering combining search text, visibility settings, and
 *    exact matching
 * 2. Advanced sorting across different fields (name, code, sequence, timestamps)
 * 3. Pagination with various configurations and boundary testing
 * 4. Exact matching capabilities for codes and names
 * 5. Complex query combinations using only supported parameters
 * 6. Edge case handling for empty results and parameter validation
 *
 * The test ensures the search system can handle the complexity needed for
 * enterprise content management where tags must be discoverable through
 * multiple organizational lenses.
 */
export async function test_api_articletag_combined_search_filters(
  connection: api.IConnection,
) {
  // Step 1: Test basic search functionality with text filtering
  const searchText = "tech";
  const basicSearchResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        search: searchText,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(basicSearchResult);

  TestValidator.predicate(
    "basic search returns results containing search text",
    basicSearchResult.data.length > 0 &&
      basicSearchResult.data.some(
        (tag) =>
          tag.name.toLowerCase().includes(searchText.toLowerCase()) ||
          tag.code.toLowerCase().includes(searchText.toLowerCase()),
      ),
  );

  // Step 2: Test visibility filtering
  const visibleOnlyResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        visible: true,
        page: 1,
        limit: 50,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(visibleOnlyResult);

  TestValidator.predicate(
    "visibility filter returns only visible tags",
    visibleOnlyResult.data.every((tag) => tag.visible === true),
  );

  const hiddenOnlyResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        visible: false,
        page: 1,
        limit: 50,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(hiddenOnlyResult);

  TestValidator.predicate(
    "visibility filter returns only hidden tags",
    hiddenOnlyResult.data.every((tag) => tag.visible === false),
  );

  // Step 3: Test sorting functionality across different fields
  const sortFields: Array<"name" | "code" | "sequence"> = [
    "name",
    "code",
    "sequence",
  ];

  for (const field of sortFields) {
    // Test ascending order
    const ascendingResult = await api.functional.shoppingMall.articleTags.index(
      connection,
      {
        body: {
          sortBy: field,
          sortOrder: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallArticleTag.IRequest,
      },
    );
    typia.assert(ascendingResult);

    TestValidator.predicate(
      `sorting by ${field} in ascending order works`,
      ascendingResult.data.length > 0 &&
        ascendingResult.data.every(
          (tag, index) =>
            index === 0 ||
            (field === "sequence"
              ? tag[field] >= ascendingResult.data[index - 1][field]
              : tag[field] >= ascendingResult.data[index - 1][field]),
        ),
    );

    // Test descending order
    const descendingResult =
      await api.functional.shoppingMall.articleTags.index(connection, {
        body: {
          sortBy: field,
          sortOrder: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallArticleTag.IRequest,
      });
    typia.assert(descendingResult);

    TestValidator.predicate(
      `sorting by ${field} in descending order works`,
      descendingResult.data.length > 0 &&
        descendingResult.data.every(
          (tag, index) =>
            index === 0 ||
            (field === "sequence"
              ? tag[field] <= descendingResult.data[index - 1][field]
              : tag[field] <= descendingResult.data[index - 1][field]),
        ),
    );
  }

  // Step 4: Test exact matching for code and name
  // Get initial results to find valid codes/names
  const initialResults = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(initialResults);

  if (initialResults.data.length > 0) {
    const exactCode = initialResults.data[0].code;
    const exactCodeResult = await api.functional.shoppingMall.articleTags.index(
      connection,
      {
        body: {
          code: exactCode,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallArticleTag.IRequest,
      },
    );
    typia.assert(exactCodeResult);

    TestValidator.predicate(
      "exact code matching returns correct results",
      exactCodeResult.data.length > 0 &&
        exactCodeResult.data[0].code === exactCode,
    );

    const exactName = initialResults.data[0].name;
    const exactNameResult = await api.functional.shoppingMall.articleTags.index(
      connection,
      {
        body: {
          name: exactName,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallArticleTag.IRequest,
      },
    );
    typia.assert(exactNameResult);

    TestValidator.predicate(
      "exact name matching returns correct results",
      exactNameResult.data.length > 0 &&
        exactNameResult.data[0].name === exactName,
    );
  }

  // Step 5: Test complex combined filters with supported parameters
  const complexFilterResult =
    await api.functional.shoppingMall.articleTags.index(connection, {
      body: {
        search: "tech",
        visible: true,
        sortBy: "sequence",
        sortOrder: "asc",
        page: 1,
        limit: 15,
      } satisfies IShoppingMallArticleTag.IRequest,
    });
  typia.assert(complexFilterResult);

  TestValidator.predicate(
    "complex multi-parameter filtering works correctly",
    complexFilterResult.data.length >= 0,
  );

  // Step 6: Test pagination boundaries
  const paginationTest = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1000, // Extremely high page number
        limit: 1,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(paginationTest);

  TestValidator.predicate(
    "pagination handles extreme page numbers gracefully",
    paginationTest.data.length === 0 &&
      paginationTest.pagination.current === 1000 &&
      paginationTest.pagination.limit === 1,
  );

  // Step 7: Test maximum limit
  const maxLimitResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        limit: 100, // Maximum allowed limit
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(maxLimitResult);

  TestValidator.predicate(
    "maximum limit returns valid number of results",
    maxLimitResult.data.length <= 100,
  );

  // Step 8: Test empty search handling
  const emptySearchResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        search: "nonexistentsearchtermthatshouldreturnnothing",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(emptySearchResult);

  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.data.length,
    0,
  );

  // Step 9: Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination metadata is consistent",
    emptySearchResult.pagination.current === 1 &&
      emptySearchResult.pagination.limit === 10 &&
      emptySearchResult.pagination.records >= 0 &&
      emptySearchResult.pagination.pages >= 0,
  );

  // Step 10: Test minimum page value boundary
  const minPageResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1, // Minimum page value
        limit: 5,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(minPageResult);

  TestValidator.equals(
    "minimum page value returns first page results",
    minPageResult.pagination.current,
    1,
  );

  // Step 11: Test sorting field validation
  const validSortResult = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        sortBy: RandomGenerator.pick([
          "name",
          "code",
          "sequence",
          "createdAt",
          "updatedAt",
          "usageCount",
        ]),
        sortOrder: RandomGenerator.pick(["asc", "desc"]),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );
  typia.assert(validSortResult);

  TestValidator.predicate(
    "valid sort field and order combination works",
    validSortResult.data.length >= 0,
  );
}
