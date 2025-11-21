import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import type { IShoppingMallAnalyticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test global search pagination handling with comprehensive coverage of page
 * sizes, limits, and edge cases.
 *
 * This test validates:
 *
 * 1. Different page sizes (1-100 items per page)
 * 2. Multiple page numbers with consistent results
 * 3. Edge cases: empty results, single results, single-page results
 * 4. Limit boundary testing (1, 50, 100)
 * 5. Result consistency across pagination
 * 6. Total results calculation accuracy
 * 7. Pagination metadata validation
 */
export async function test_api_global_search_pagination_handling(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const basicSearchRequest = {
    query: "electronics",
    sort_order: "relevance" as const,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const basicResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: basicSearchRequest,
    },
  );
  typia.assert(basicResults);

  // Validate pagination metadata
  TestValidator.predicate(
    "basic search pagination current page",
    basicResults.pagination.current === basicSearchRequest.page,
  );
  TestValidator.predicate(
    "basic search pagination limit",
    basicResults.pagination.limit === basicSearchRequest.limit,
  );
  TestValidator.predicate(
    "basic search pagination records >= 0",
    basicResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "basic search pagination pages >= 1",
    basicResults.pagination.pages >= 1,
  );

  // Test 2: Edge case - minimum limit (1 item per page)
  const minLimitRequest = {
    query: "test",
    sort_order: "relevance" as const,
    page: 1,
    limit: 1,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const minLimitResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: minLimitRequest,
    },
  );
  typia.assert(minLimitResults);

  TestValidator.predicate(
    "min limit has 0 or 1 results",
    minLimitResults.data.length <= 1,
  );
  TestValidator.predicate(
    "min limit pagination correct",
    minLimitResults.pagination.limit === 1,
  );

  // Test 3: Edge case - maximum limit (100 items per page)
  const maxLimitRequest = {
    query: "product",
    sort_order: "relevance" as const,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const maxLimitResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: maxLimitRequest,
    },
  );
  typia.assert(maxLimitResults);

  TestValidator.predicate(
    "max limit has 100 or fewer results",
    maxLimitResults.data.length <= 100,
  );
  TestValidator.predicate(
    "max limit pagination correct",
    maxLimitResults.pagination.limit === 100,
  );

  // Test 4: Multiple pages navigation with proper content comparison
  const pageSize = 5;
  const firstPageRequest = {
    query: "item",
    sort_order: "relevance" as const,
    page: 1,
    limit: pageSize,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const firstPageResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: firstPageRequest,
    },
  );
  typia.assert(firstPageResults);

  // Only test second page if first page has full results
  if (
    firstPageResults.data.length === pageSize &&
    firstPageResults.pagination.pages > 1
  ) {
    const secondPageRequest = {
      query: "item",
      sort_order: "relevance" as const,
      page: 2,
      limit: pageSize,
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const secondPageResults = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: secondPageRequest,
      },
    );
    typia.assert(secondPageResults);

    TestValidator.predicate(
      "second page current page",
      secondPageResults.pagination.current === 2,
    );
    TestValidator.predicate(
      "second page limit consistent",
      secondPageResults.pagination.limit === firstPageResults.pagination.limit,
    );

    // Validate content differences: Check that first item from each page are different
    if (firstPageResults.data.length > 0 && secondPageResults.data.length > 0) {
      TestValidator.notEquals(
        "different results between first and second page",
        firstPageResults.data[0].search_query,
        secondPageResults.data[0].search_query,
      );
    }
  }

  // Test 5: Edge case - non-existent query (should return empty results)
  const emptySearchRequest = {
    query: "xyznonexistentquery123",
    sort_order: "relevance" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const emptyResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: emptySearchRequest,
    },
  );
  typia.assert(emptyResults);

  TestValidator.predicate(
    "empty search returns empty data",
    emptyResults.data.length === 0,
  );
  TestValidator.predicate(
    "empty search total results",
    emptyResults.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty search pages",
    emptyResults.pagination.pages === 0,
  );

  // Test 6: Boundary limit testing using ArrayUtil.asyncRepeat
  const boundaryLimits = [5, 10, 25, 50, 75] as const;

  await ArrayUtil.asyncRepeat(boundaryLimits.length, async (index) => {
    const limit = boundaryLimits[index];
    const boundaryRequest = {
      query: "category",
      sort_order: "relevance" as const,
      page: 1,
      limit: limit,
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const boundaryResults = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: boundaryRequest,
      },
    );
    typia.assert(boundaryResults);

    TestValidator.predicate(
      `boundary limit ${limit} <= limit`,
      boundaryResults.data.length <= limit,
    );
    TestValidator.predicate(
      `boundary pagination limit ${limit}`,
      boundaryResults.pagination.limit === limit,
    );
  });

  // Test 7: Verify data structure consistency across pages
  const consistencyRequest = {
    query: "popular",
    sort_order: "popularity" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const consistencyResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: consistencyRequest,
    },
  );
  typia.assert(consistencyResults);

  // Validate each result has proper nested structure
  for (const result of consistencyResults.data) {
    TestValidator.predicate(
      "result has valid categories array",
      Array.isArray(result.categories),
    );
    TestValidator.predicate(
      "result has valid products array",
      Array.isArray(result.products),
    );
    TestValidator.predicate(
      "result has valid sellers array",
      Array.isArray(result.sellers),
    );
    TestValidator.predicate(
      "result has valid customers array",
      Array.isArray(result.customers),
    );
    TestValidator.predicate(
      "result has valid analytics array",
      Array.isArray(result.analytics),
    );
    TestValidator.predicate(
      "result has valid total_results",
      typeof result.total_results === "number",
    );
    TestValidator.predicate(
      "result has valid search_query",
      typeof result.search_query === "string",
    );
  }

  // Test 8: High page number validation
  const highPageRequest = {
    query: "test",
    sort_order: "relevance" as const,
    page: 1000, // High page number
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const highPageResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: highPageRequest,
    },
  );
  typia.assert(highPageResults);

  TestValidator.predicate(
    "high page returns valid pagination",
    highPageResults.pagination.current === 1000,
  );
  TestValidator.predicate(
    "high page total results valid",
    highPageResults.pagination.records >= 0,
  );

  console.log("✅ All pagination tests passed successfully");
}
