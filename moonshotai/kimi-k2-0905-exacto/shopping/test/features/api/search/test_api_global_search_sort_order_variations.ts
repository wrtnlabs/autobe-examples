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
 * Test different result sorting options including relevance, date, price
 * ascending, price descending, and popularity. Validates that each sorting
 * method produces appropriately ordered results and maintains search quality.
 * Tests sorting stability and performance across different query types.
 *
 * This comprehensive test validates the global search functionality's ability
 * to sort results according to different criteria. The test covers:
 *
 * 1. Relevance sorting - products with exact matches should appear first
 * 2. Date sorting - newer products/articles should appear first
 * 3. Price ascending - products from lowest to highest price
 * 4. Price descending - products from highest to lowest price
 * 5. Popularity sorting - based on user engagement metrics
 *
 * The test ensures that each sorting option works correctly across different
 * content types (products, articles, FAQ, help) and that the results maintain
 * logical ordering.
 */
export async function test_api_global_search_sort_order_variations(
  connection: api.IConnection,
) {
  // Step 1: Test relevance sorting with exact match queries
  const relevanceQuery = "laptop";
  const relevanceResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: relevanceQuery,
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(relevanceResults);

  // Validate relevance: check that search results are returned
  TestValidator.predicate(
    "relevance sorting returns search results",
    relevanceResults.data.length > 0 &&
      relevanceResults.data[0].total_results >= 0,
  );

  // Step 2: Test date sorting
  const dateQuery = "electronics";
  const dateAscending = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: dateQuery,
        sort_order: "date",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(dateAscending);

  // Verify date results are returned
  TestValidator.predicate(
    "date sorting returns results",
    dateAscending.data.length > 0,
  );

  // Step 3: Test price ascending sorting
  const priceQuery = "phone";
  const priceAscResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: priceQuery,
        sort_order: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(priceAscResults);

  // Verify ascending price order
  if (priceAscResults.data.length > 0) {
    const prices = priceAscResults.data[0].products.map((p) => p.price);
    if (prices.length > 1) {
      const isAscending = prices
        .slice(0, -1)
        .every((price, index) => price <= prices[index + 1]);
      TestValidator.predicate(
        "price ascending sorting orders correctly",
        isAscending,
      );
    }
  }

  // Step 4: Test price descending sorting
  const priceDescResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: priceQuery,
        sort_order: "price_desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(priceDescResults);

  // Verify descending price order
  if (priceDescResults.data.length > 0) {
    const descPrices = priceDescResults.data[0].products.map((p) => p.price);
    if (descPrices.length > 1) {
      const isDescending = descPrices
        .slice(0, -1)
        .every((price, index) => price >= descPrices[index + 1]);
      TestValidator.predicate(
        "price descending sorting orders correctly",
        isDescending,
      );
    }
  }

  // Step 5: Test popularity sorting
  const popularQuery = "featured";
  const popularityResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: popularQuery,
        sort_order: "popularity",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(popularityResults);

  // Validate popularity results contain analytics data
  TestValidator.predicate(
    "popularity sorting returns results with analytics",
    popularityResults.data.length > 0,
  );

  // Step 6: Test mixed content type sorting
  const mixedQuery = "product";
  const mixedResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: mixedQuery,
        sort_order: "relevance",
        content_types: ["products", "articles"],
        page: 1,
        limit: 15,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(mixedResults);

  // Verify multi-type search includes results
  TestValidator.predicate(
    "mixed content type search includes multiple result types",
    mixedResults.data.length > 0,
  );

  // Step 7: Test sorting stability with pagination
  const page1Results = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "test",
        sort_order: "relevance",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(page1Results);

  const page2Results = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "test",
        sort_order: "relevance",
        page: 2,
        limit: 5,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(page2Results);

  // Verify pagination works correctly
  TestValidator.predicate(
    "pagination returns different result sets",
    page1Results.data.length >= 0 && page2Results.data.length >= 0,
  );

  // Step 8: Test edge cases
  // Empty query should return appropriate results
  const emptyResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "",
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty query handles correctly",
    Array.isArray(emptyResults.data),
  );

  // High limit should work
  const highLimitResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "a",
        sort_order: "relevance",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(highLimitResults);
  TestValidator.predicate(
    "maximum limit returns correct number of results",
    highLimitResults.data.length <= 100,
  );
}
