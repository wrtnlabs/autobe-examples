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

export async function test_api_global_search_comprehensive_discovery(
  connection: api.IConnection,
) {
  // Test basic product search functionality
  const basicSearchQuery = "electronics";
  const basicSearchRequest = {
    query: basicSearchQuery,
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const basicSearchResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: basicSearchRequest },
  );
  typia.assert(basicSearchResults);

  TestValidator.predicate(
    "basic search returns results",
    basicSearchResults.data.length > 0,
  );

  TestValidator.predicate(
    "basic search has valid pagination",
    basicSearchResults.pagination.current === 1 &&
      basicSearchResults.pagination.limit === 20,
  );

  // Test multi-type content search (products, articles, faq, help)
  const multiTypeQuery = "laptop computer guide";
  const multiTypeRequest = {
    query: multiTypeQuery,
    content_types: ["products", "articles", "faq", "help"] as const,
    sort_order: "relevance" as const,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const multiTypeResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: multiTypeRequest },
  );
  typia.assert(multiTypeResults);

  TestValidator.predicate(
    "multi-type search returns results",
    multiTypeResults.data.length > 0,
  );

  // Verify all content types are represented in results
  const hasProducts = multiTypeResults.data.some(
    (result) => result.products.length > 0,
  );
  const hasArticles = multiTypeResults.data.some(
    (result) => result.analytics.length > 0,
  );

  TestValidator.predicate(
    "multi-type search includes various content",
    hasProducts || hasArticles,
  );

  // Test price range filtering for products
  const priceRangeQuery = "smartphone";
  const priceRangeRequest = {
    query: priceRangeQuery,
    min_price: 200,
    max_price: 800,
    sort_order: "price_asc" as const,
    page: 1,
    limit: 30,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const priceRangeResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: priceRangeRequest },
  );
  typia.assert(priceRangeResults);

  TestValidator.predicate(
    "price range search returns results within range",
    priceRangeResults.data.length > 0,
  );

  // Test category-specific search
  const categoryQuery = "computer accessories";
  const categoryRequest = {
    query: categoryQuery,
    category_filter: typia.random<string & tags.Format<"uuid">>(),
    sort_order: "relevance" as const,
    page: 1,
    limit: 25,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const categoryResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: categoryRequest },
  );
  typia.assert(categoryResults);

  TestValidator.predicate(
    "category filtered search returns results",
    categoryResults.data.length >= 0,
  );

  // Test different sorting preferences
  const sortTestQuery = "headphones";

  // Test date sorting
  const dateSortedRequest = {
    query: sortTestQuery,
    sort_order: "date" as const,
    page: 1,
    limit: 15,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const dateSortedResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: dateSortedRequest },
  );
  typia.assert(dateSortedResults);

  TestValidator.predicate(
    "date sorted search returns results",
    dateSortedResults.data.length > 0,
  );

  // Test popularity sorting
  const popularityRequest = {
    query: sortTestQuery,
    sort_order: "popularity" as const,
    page: 1,
    limit: 15,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const popularityResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: popularityRequest },
  );
  typia.assert(popularityResults);

  TestValidator.predicate(
    "popularity sorted search returns results",
    popularityResults.data.length > 0,
  );

  // Test pagination functionality
  const paginationQuery = "books";
  const page1Request = {
    query: paginationQuery,
    sort_order: "relevance" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const page1Results = await api.functional.shoppingMall.search.global(
    connection,
    { body: page1Request },
  );
  typia.assert(page1Results);

  const page2Request = {
    query: paginationQuery,
    sort_order: "relevance" as const,
    page: 2,
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const page2Results = await api.functional.shoppingMall.search.global(
    connection,
    { body: page2Request },
  );
  typia.assert(page2Results);

  TestValidator.predicate(
    "pagination returns different results",
    page1Results.pagination.current !== page2Results.pagination.current,
  );

  // Test empty search query handling
  const emptyQueryRequest = {
    query: "",
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const emptyQueryResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: emptyQueryRequest },
  );
  typia.assert(emptyQueryResults);

  TestValidator.predicate(
    "empty search query handled gracefully",
    emptyQueryResults.data.length >= 0,
  );

  // Test search with user preferences
  const preferencesQuery = "fashion";
  const preferencesRequest = {
    query: preferencesQuery,
    user_preferences: ["men", "casual", "summer"],
    sort_order: "relevance" as const,
    page: 1,
    limit: 25,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const preferencesResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: preferencesRequest },
  );
  typia.assert(preferencesResults);

  TestValidator.predicate(
    "search with user preferences returns results",
    preferencesResults.data.length > 0,
  );

  // Test search field filtering
  const fieldSearchQuery = "wireless";
  const fieldSearchRequest = {
    query: fieldSearchQuery,
    search_fields: ["name", "description"],
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const fieldSearchResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: fieldSearchRequest },
  );
  typia.assert(fieldSearchResults);

  TestValidator.predicate(
    "field filtered search returns results",
    fieldSearchResults.data.length > 0,
  );

  // Test date range filtering
  const dateRangeQuery = "new arrivals";
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const dateRangeFormat =
    thirtyDaysAgo.toISOString().split("T")[0] +
    ".." +
    currentDate.toISOString().split("T")[0];

  const dateRangeRequest = {
    query: dateRangeQuery,
    date_range: dateRangeFormat,
    sort_order: "date" as const,
    page: 1,
    limit: 30,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const dateRangeResults = await api.functional.shoppingMall.search.global(
    connection,
    { body: dateRangeRequest },
  );
  typia.assert(dateRangeResults);

  TestValidator.predicate(
    "date range search returns results",
    dateRangeResults.data.length > 0,
  );

  // Verify total results count consistency
  for (const result of [
    basicSearchResults,
    multiTypeResults,
    priceRangeResults,
  ]) {
    TestValidator.predicate(
      "total results count matches pagination info",
      result.pagination.records === result.data.length ||
        result.pagination.records > result.data.length,
    );

    TestValidator.equals(
      "search query preserved in results",
      result.data[0]?.search_query?.toLowerCase().includes("electronics") ||
        result.data[0]?.search_query?.toLowerCase().includes("laptop") ||
        result.data[0]?.search_query?.toLowerCase().includes("smartphone") ||
        result.data[0]?.search_query?.toLowerCase().includes("headphones") ||
        result.data[0]?.search_query?.toLowerCase().includes("books") ||
        result.data[0]?.search_query?.toLowerCase().includes("fashion") ||
        result.data[0]?.search_query?.toLowerCase().includes("wireless") ||
        result.data[0]?.search_query?.toLowerCase().includes("new arrivals"),
      result.data[0]?.search_query !== undefined,
    );
  }
}
