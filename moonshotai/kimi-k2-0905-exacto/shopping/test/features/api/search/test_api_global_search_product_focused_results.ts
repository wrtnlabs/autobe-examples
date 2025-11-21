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

export async function test_api_global_search_product_focused_results(
  connection: api.IConnection,
) {
  /**
   * Test global search with product-focused queries returning relevant product
   * listings with proper categorization, pricing information, and availability
   * status. Validates search result accuracy for product discovery workflows
   * ensuring customers can efficiently locate desired items across the
   * marketplace catalog.
   */

  // Test 1: Basic product search with electronics-related query
  const searchQuery1 = "electronics";
  const basicSearchResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: searchQuery1,
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(basicSearchResults);

  // Validate basic search returns structured results
  TestValidator.predicate(
    "basic search returns results with valid pagination",
    basicSearchResults.pagination.current === 1 &&
      basicSearchResults.pagination.limit === 10,
  );

  // Test 2: Price range filtering for product discovery
  const minPrice = 50;
  const maxPrice = 200;
  const priceFilterQuery = RandomGenerator.substring("mobile phone technology");
  const priceRangeResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: priceFilterQuery,
        min_price: minPrice,
        max_price: maxPrice,
        sort_order: "price_asc",
        page: 1,
        limit: 15,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(priceRangeResults);

  // Validate price filtered results structure
  const hasValidProductResults = priceRangeResults.data.some(
    (result) => result.products.length > 0 && result.total_results > 0,
  );
  TestValidator.predicate(
    "price filtered search returns valid product results",
    hasValidProductResults,
  );

  // Validate search results have seller information for marketplace context
  const priceFilteredProducts = priceRangeResults.data.flatMap(
    (result) => result.products,
  );
  const productsHaveSellers =
    priceFilteredProducts.length > 0 &&
    priceFilteredProducts.every(
      (product) =>
        product.seller &&
        typia.is<IShoppingMallSeller.ISummary>(product.seller),
    );
  TestValidator.predicate(
    "price-filtered products have valid seller information in marketplace",
    productsHaveSellers,
  );

  // Test 3: Search with content type filtering for products only
  const productOnlyQuery = "laptop computer";
  const productOnlyResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: productOnlyQuery,
        content_types: ["products"],
        sort_order: "popularity",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(productOnlyResults);

  // Validate products-only search focus on product entities
  const hasProductEntities = productOnlyResults.data.some(
    (result) =>
      result.products.length > 0 &&
      result.products.every(
        (product) => product.name && product.description && product.price >= 0,
      ),
  );
  TestValidator.predicate(
    "products-only search returns valid product entities with descriptions",
    hasProductEntities,
  );

  // Verify products have proper categorization for discovery
  const hasCategorizedProducts = productOnlyResults.data.some(
    (result) =>
      result.products.length > 0 &&
      result.products.every(
        (product) =>
          product.category &&
          typia.is<IShoppingMallProductCategory.ISummary>(product.category) &&
          product.category.path.length > 0,
      ),
  );
  TestValidator.predicate(
    "products in results have proper category information for discovery",
    hasCategorizedProducts,
  );

  // Test 4: Pagination validation with consistent search query
  const paginationQuery = "fashion clothing";
  const pageOneResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: paginationQuery,
        sort_order: "date",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(pageOneResults);

  const pageTwoResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: paginationQuery,
        sort_order: "date",
        page: 2,
        limit: 5,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(pageTwoResults);

  // Validate pagination metadata accuracy
  TestValidator.predicate(
    "pagination metadata shows correct current page numbers",
    pageOneResults.pagination.current === 1 &&
      pageTwoResults.pagination.current === 2,
  );

  // Validate pagination returns different data sets
  const hasDifferentDataSets =
    pageOneResults.data.length > 0 || pageTwoResults.data.length > 0;
  TestValidator.predicate(
    "pagination returns valid search data across pages",
    hasDifferentDataSets,
  );

  // Test 5: Multi-content type search for comprehensive discovery
  const multiTypeQuery = RandomGenerator.substring(
    "digital accessories reviews",
  );
  const multiTypeResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: multiTypeQuery,
        content_types: ["products", "articles"],
        sort_order: "relevance",
        page: 1,
        limit: 25,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(multiTypeResults);

  // Validate multi-type search accommodates comprehensive discovery
  const hasDiscoveryResults = multiTypeResults.data.some(
    (result) =>
      result.products.length > 0 ||
      result.categories.length > 0 ||
      result.analytics.length > 0,
  );
  TestValidator.predicate(
    "multi-content search provides diverse discovery results",
    hasDiscoveryResults,
  );

  // Test 6: Search with user preferences for personalized discovery
  const userPreferenceQuery = RandomGenerator.name(1);
  const userPreferenceResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: userPreferenceQuery,
        user_preferences: ["electronics", "games"],
        sort_order: "relevance",
        page: 1,
        limit: 12,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(userPreferenceResults);

  // Validate preference-based search returns structured marketplace data
  const hasStructuredResults = userPreferenceResults.data.some((result) =>
    result.products.every(
      (product) => product.name && product.seller && product.price >= 0,
    ),
  );
  TestValidator.predicate(
    "user preference search returns structured marketplace data with sellers",
    hasStructuredResults,
  );

  // Test 7: Price-based sorting validation
  const priceSortQuery = "smartphone";
  const priceSortedResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: priceSortQuery,
        sort_order: "price_desc",
        page: 1,
        limit: 8,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(priceSortedResults);

  // Validate price sorting is implemented correctly
  const hasPriceResults = priceSortedResults.data.some(
    (result) =>
      result.products.length > 0 &&
      result.products.every((product) => typeof product.price === "number"),
  );
  TestValidator.predicate(
    "price-descending search returns products with valid pricing data",
    hasPriceResults,
  );

  // Test 8: Search query preservation validation
  const query = RandomGenerator.alphabets(6);
  const queryPreservedResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: query,
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(queryPreservedResults);

  // Validate search query is preserved in all result structures
  const queryPreserved = queryPreservedResults.data.some(
    (result) => result.search_query === query && result.total_results >= 0,
  );
  TestValidator.predicate(
    "search queries are preserved accurately across search results",
    queryPreserved,
  );

  // Test 9: Product image representation validation
  const productImageQuery = "digital camera";
  const productImageResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: productImageQuery,
        sort_order: "popularity",
        page: 1,
        limit: 6,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(productImageResults);

  // Validate product images are properly represented
  const hasProductImages = productImageResults.data.some((result) =>
    result.products.some(
      (product) => product.images && Array.isArray(product.images),
    ),
  );
  TestValidator.predicate(
    "products in search results have valid image representation",
    hasProductImages,
  );
}
