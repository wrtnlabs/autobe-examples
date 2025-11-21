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

export async function test_api_global_search_price_range_filtering(
  connection: api.IConnection,
) {
  // Remove the invalid product creation logic and focus on testing the actual search API
  // Since this is testing search filtering, we'll work with the existing product catalog

  // Test 1: Basic price range with minimum price filter
  const lowPriceSearchBody = {
    query: "phone", // Generic search term that should return many products
    min_price: 100,
    page: 1,
    limit: 10,
    sort_order:
      "price_asc" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const lowPriceResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: lowPriceSearchBody,
    },
  );
  typia.assert(lowPriceResults);

  // Verify that all products meet minimum price requirement
  TestValidator.predicate(
    "all products meet minimum price requirement",
    lowPriceResults.data.every((result) =>
      result.products.every((product) => product.price >= 100),
    ),
  );

  TestValidator.predicate(
    "results returned for price-filtered search",
    lowPriceResults.data.length > 0 &&
      lowPriceResults.data[0].products.length > 0,
  );

  // Test 2: Search with maximum price filter
  const highPriceSearchBody = {
    query: "laptop",
    max_price: 500,
    page: 1,
    limit: 10,
    sort_order:
      "price_desc" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const highPriceResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: highPriceSearchBody,
    },
  );
  typia.assert(highPriceResults);

  // Verify that all products meet maximum price requirement
  TestValidator.predicate(
    "all products meet maximum price requirement",
    highPriceResults.data.every((result) =>
      result.products.every((product) => product.price <= 500),
    ),
  );

  TestValidator.predicate(
    "results returned for max price filtered search",
    highPriceResults.data.length > 0 &&
      highPriceResults.data[0].products.length > 0,
  );

  // Test 3: Search with both min_price and max_price filters
  const rangeSearchBody = {
    query: "wireless headphones",
    min_price: 50,
    max_price: 300,
    page: 1,
    limit: 10,
    sort_order:
      "relevance" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const rangeResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: rangeSearchBody,
    },
  );
  typia.assert(rangeResults);

  // Verify that all products are within the price range
  TestValidator.predicate(
    "all products within price range",
    rangeResults.data.every((result) =>
      result.products.every(
        (product) => product.price >= 50 && product.price <= 300,
      ),
    ),
  );

  TestValidator.predicate(
    "results returned for price range search",
    rangeResults.data.length > 0 && rangeResults.data[0].products.length > 0,
  );

  // Test 4: Edge case - search for very expensive items
  const veryHighPriceSearchBody = {
    query: "smartphone",
    min_price: 1000,
    page: 1,
    limit: 10,
    sort_order:
      "price_desc" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const veryHighPriceResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: veryHighPriceSearchBody,
    },
  );
  typia.assert(veryHighPriceResults);

  // Verify that products are very expensive
  TestValidator.predicate(
    "products meet very high price requirement",
    veryHighPriceResults.data.every((result) =>
      result.products.every((product) => product.price >= 1000),
    ),
  );

  // Test 5: Edge case - search for free/cheap items
  const cheapPriceSearchBody = {
    query: "accessories",
    max_price: 20,
    page: 1,
    limit: 10,
    sort_order:
      "price_asc" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const cheapPriceResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: cheapPriceSearchBody,
    },
  );
  typia.assert(cheapPriceResults);

  // Verify that products are cheap
  TestValidator.predicate(
    "products meet cheap price requirement",
    cheapPriceResults.data.every((result) =>
      result.products.every((product) => product.price <= 20),
    ),
  );

  TestValidator.predicate(
    "results returned for cheap price search",
    cheapPriceResults.data.length > 0 &&
      cheapPriceResults.data[0].products.length > 0,
  );

  // Test 6: Verify pagination works with price filters
  const paginatedSearchBody = {
    query: "tablet",
    min_price: 200,
    max_price: 800,
    page: 1,
    limit: 5,
    sort_order:
      "price_asc" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const paginatedResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: paginatedSearchBody,
    },
  );
  typia.assert(paginatedResults);

  TestValidator.equals(
    "pagination respects limit",
    paginatedResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination maintains price constraints",
    paginatedResults.data.every((result) =>
      result.products.every(
        (product) => product.price >= 200 && product.price <= 800,
      ),
    ),
  );

  TestValidator.predicate(
    "pagination results returned",
    paginatedResults.data.length > 0 &&
      paginatedResults.data[0].products.length > 0,
  );

  // Test 7: Verify no price filter returns all price ranges
  const noFilterSearchBody = {
    query: "electronics",
    page: 1,
    limit: 20,
    sort_order:
      "price_desc" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const noFilterResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: noFilterSearchBody,
    },
  );
  typia.assert(noFilterResults);

  TestValidator.predicate(
    "no price filter returns varied price products",
    noFilterResults.data.length > 0 &&
      noFilterResults.data[0].products.some((p) => p.price > 1000) &&
      noFilterResults.data[0].products.some((p) => p.price < 100),
  );

  // Test 8: Verify relevance scoring works with price constraints
  const relevantSearchBody = {
    query: "gaming console",
    min_price: 300,
    max_price: 600,
    page: 1,
    limit: 5,
    sort_order:
      "relevance" satisfies IShoppingMallGlobalSearch.IRequest["sort_order"],
    content_types: ["products"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const relevantResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: relevantSearchBody,
    },
  );
  typia.assert(relevantResults);

  // Verify price constraints are maintained with relevance sorting
  TestValidator.predicate(
    "relevance search maintains price constraints",
    relevantResults.data.every((result) =>
      result.products.every(
        (product) => product.price >= 300 && product.price <= 600,
      ),
    ),
  );

  TestValidator.predicate(
    "relevance search returns results",
    relevantResults.data.length > 0 &&
      relevantResults.data[0].products.length > 0,
  );
}
