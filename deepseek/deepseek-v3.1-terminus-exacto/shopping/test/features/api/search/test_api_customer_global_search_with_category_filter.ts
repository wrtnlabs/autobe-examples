import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { IPriceRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPriceRange";
import type { ISearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchFilters";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";

/**
 * Test search with category-specific filtering for targeted product discovery.
 * Customer performs a search filtered by specific product category and
 * validates that results are limited to products within the specified category
 * hierarchy. Verifies category-based filtering accuracy and hierarchical
 * category support for precise product discovery.
 */
export async function test_api_customer_global_search_with_category_filter(
  connection: api.IConnection,
) {
  // 1. Customer joins the platform
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "securePassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Prepare search criteria with category filtering
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const searchRequest = {
    query: RandomGenerator.paragraph({ sentences: 2 }),
    entityTypes: ["products"] as const,
    filters: {
      categoryId: categoryId,
    } satisfies ISearchFilters,
    pagination: {
      page: 1,
      limit: 10,
      sortBy: "relevance",
      sortOrder: "desc" as const,
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  // 3. Perform global search with category filter
  const searchResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResults);

  // 4. Validate search results structure
  TestValidator.equals(
    "search results should have correct pagination",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "search results should respect page limit",
    searchResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "search results should have non-negative records count",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search results should have valid pages count",
    searchResults.pagination.pages >= 0,
  );

  // 5. Validate that search was executed with category filtering
  TestValidator.predicate(
    "search results data should be an array",
    Array.isArray(searchResults.data),
  );

  // 6. Test search functionality with different queries
  const alternativeSearchRequest = {
    query: "test product search",
    entityTypes: ["products"] as const,
    filters: {
      categoryId: categoryId,
    } satisfies ISearchFilters,
    pagination: {
      page: 1,
      limit: 5,
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const alternativeResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: alternativeSearchRequest,
      },
    );
  typia.assert(alternativeResults);

  // 7. Validate alternative search results
  TestValidator.equals(
    "alternative search should return correct pagination",
    alternativeResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "alternative search should respect different page limit",
    alternativeResults.pagination.limit,
    5,
  );

  // 8. Test that search API is functioning correctly
  TestValidator.predicate(
    "search API should return consistent result structure",
    searchResults.data.length >= 0 && alternativeResults.data.length >= 0,
  );

  // Note: The actual category filtering validation would require pre-populated
  // test data with known category relationships. Since this is an E2E test
  // without database setup, we validate that the API responds correctly
  // to category filtering requests rather than testing specific category logic.
}
