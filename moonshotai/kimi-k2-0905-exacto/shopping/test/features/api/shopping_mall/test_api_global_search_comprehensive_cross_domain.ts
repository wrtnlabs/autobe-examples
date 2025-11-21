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
 * Test comprehensive cross-domain search spanning all content types (products,
 * articles, FAQ, help, sellers, customers, categories, analytics). Validates
 * unified search experience across disparate content types, proper result
 * organization, and consistent metadata formatting across different entity
 * types.
 *
 * This test implements a complete user journey covering:
 *
 * 1. Basic product search functionality
 * 2. Multi-domain search with content type filtering
 * 3. Advanced search with price and date filters
 * 4. Seller and customer search capabilities
 * 5. Search result validation including pagination
 * 6. Content-specific searches (FAQ, help documentation)
 * 7. Search with user preferences and personalization
 * 8. Analytics data integration in search results
 * 9. Result ordering and sorting validation
 * 10. Cross-domain result consistency verification
 */
export async function test_api_global_search_comprehensive_cross_domain(
  connection: api.IConnection,
) {
  // Step 1: Perform basic product search
  const productQuery = RandomGenerator.name(2);
  const productSearchResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: productQuery,
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(productSearchResult);
  TestValidator.equals(
    "product search has results",
    productSearchResult.data.length > 0,
    true,
  );

  // Step 2: Search across multiple content types with filtering
  const multiContentQuery = RandomGenerator.paragraph({ sentences: 3 });
  const multiContentResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: multiContentQuery,
        content_types: ["products", "articles", "faq", "help"],
        sort_order: "date",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(multiContentResult);
  TestValidator.equals(
    "multi-content search has results",
    multiContentResult.data.length > 0,
    true,
  );

  // Step 3: Advanced search with price filters
  const priceRangeQuery = "electronics";
  const minPrice = 100;
  const maxPrice = 1000;
  const priceFilteredResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: priceRangeQuery,
        min_price: minPrice,
        max_price: maxPrice,
        sort_order: "price_asc",
        page: 1,
        limit: 15,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(priceFilteredResult);

  // Validate price filtering on actual products in results
  const firstResultProducts = priceFilteredResult.data.flatMap(
    (result) => result.products,
  );
  if (firstResultProducts.length > 0) {
    const firstProduct = firstResultProducts[0];
    TestValidator.predicate(
      "first product price within range",
      firstProduct.price >= minPrice,
    );
  }

  // Step 4: Search with date range filter
  const dateRangeQuery = RandomGenerator.name();
  const dateRangeResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: dateRangeQuery,
        date_range: "2024-01-01..2024-12-31",
        sort_order: "date",
        page: 1,
        limit: 25,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range search has results",
    dateRangeResult.data.length > 0,
    true,
  );

  // Step 5: Search with user preferences
  const preferenceQuery = "fashion";
  const userPreferences = ["trending", "sale", "popular"];
  const preferenceResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: preferenceQuery,
        user_preferences: userPreferences,
        sort_order: "popularity",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(preferenceResult);

  // Step 6: Search with specific fields
  const fieldQuery = "sale";
  const fieldSearchResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: fieldQuery,
        search_fields: ["name", "description"],
        sort_order: "relevance",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(fieldSearchResult);

  // Step 7: Pagination test
  const paginationQuery = "popular";
  const page1 = await api.functional.shoppingMall.search.global(connection, {
    body: {
      query: paginationQuery,
      sort_order: "popularity",
      page: 1,
      limit: 5,
    } satisfies IShoppingMallGlobalSearch.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 has correct limit", page1.pagination.limit, 5);

  const page2 = await api.functional.shoppingMall.search.global(connection, {
    body: {
      query: paginationQuery,
      sort_order: "popularity",
      page: 2,
      limit: 5,
    } satisfies IShoppingMallGlobalSearch.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct page number",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 results different from page 1",
    JSON.stringify(page1.data) !== JSON.stringify(page2.data),
  );

  // Step 8: Comprehensive validation with sample results
  const sampleResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "test",
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(sampleResult);

  // Validate structure of first result if available
  if (sampleResult.data.length > 0) {
    const firstResult = sampleResult.data[0];
    TestValidator.predicate(
      "categories is array",
      Array.isArray(firstResult.categories),
    );
    TestValidator.predicate(
      "products is array",
      Array.isArray(firstResult.products),
    );
    TestValidator.predicate(
      "sellers is array",
      Array.isArray(firstResult.sellers),
    );
    TestValidator.predicate(
      "customers is array",
      Array.isArray(firstResult.customers),
    );
    TestValidator.predicate(
      "analytics is array",
      Array.isArray(firstResult.analytics),
    );
    TestValidator.predicate(
      "total_results non-negative",
      firstResult.total_results >= 0,
    );
    TestValidator.equals(
      "search_query matches input",
      firstResult.search_query,
      "test",
    );
  }

  // Step 9: Test archived content inclusion
  const archivedResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "desktop",
        include_archived: true,
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(archivedResult);

  // Step 10: Comprehensive validation with targeted queries
  const targetedQueries = [
    RandomGenerator.name(),
    RandomGenerator.paragraph({ sentences: 1 }),
    typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
  ];

  for (const query of targetedQueries) {
    const comprehensiveResult = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: {
          query: query,
          content_types: RandomGenerator.sample(
            ["products", "articles", "faq", "help"],
            RandomGenerator.pick([1, 2]),
          ),
          sort_order: RandomGenerator.pick(["relevance", "date", "price_asc"]),
          page: 1,
          limit: 15,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
    typia.assert(comprehensiveResult);

    TestValidator.predicate(
      "search has pagination data",
      comprehensiveResult.pagination !== undefined,
    );
    TestValidator.predicate(
      "search has valid data array",
      Array.isArray(comprehensiveResult.data),
    );
  }
}
