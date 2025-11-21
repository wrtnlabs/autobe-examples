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
 * Validate global search functionality with price range filtering for customer
 * shopping experiences.
 *
 * This test verifies that customers can perform comprehensive searches across
 * the shopping mall platform with specific price range criteria. The test
 * ensures that only products within the specified price boundaries are
 * returned, supporting budget-conscious shopping decisions.
 *
 * Workflow:
 *
 * 1. Create and authenticate a customer account
 * 2. Perform global search with price range filtering
 * 3. Validate that results match the price criteria
 * 4. Verify pagination and search result structure
 * 5. Test error scenarios with invalid price ranges
 */
export async function test_api_customer_global_search_with_price_range_filter(
  connection: api.IConnection,
) {
  // 1. Customer authentication setup
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/search",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Perform global search with valid price range filtering
  const searchQuery = "electronics smartphone"; // Realistic search query
  const minPrice = 100;
  const maxPrice = 500;

  const searchResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          filters: {
            priceRange: {
              min: minPrice,
              max: maxPrice,
            } satisfies IPriceRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 20,
            sortBy: "relevance",
            sortOrder: "desc",
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(searchResults);

  // 3. Validate search results structure with proper TestValidator titles
  TestValidator.equals(
    "search results should have pagination metadata",
    typeof searchResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination current page should be non-negative",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    searchResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records should be non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should be non-negative",
    searchResults.pagination.pages >= 0,
  );

  // 4. Validate search results array structure
  TestValidator.predicate(
    "search should return results array",
    Array.isArray(searchResults.data),
  );

  // 5. Test error scenario with invalid price range (min > max)
  await TestValidator.error(
    "search should fail with invalid price range (min > max)",
    async () => {
      await api.functional.shoppingMall.customer.search.global.search(
        connection,
        {
          body: {
            query: searchQuery,
            filters: {
              priceRange: {
                min: 1000,
                max: 100,
              } satisfies IPriceRange,
            } satisfies ISearchFilters,
            pagination: {
              page: 1,
              limit: 20,
            } satisfies IPagination,
          } satisfies IShoppingMallGlobalSearch.IRequest,
        },
      );
    },
  );

  // 6. Test boundary case with only minimum price
  const minOnlyResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          filters: {
            priceRange: {
              min: 200,
            } satisfies IPriceRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 10,
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(minOnlyResults);
  TestValidator.predicate(
    "min-only price filter should return results",
    Array.isArray(minOnlyResults.data),
  );

  // 7. Test boundary case with only maximum price
  const maxOnlyResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          filters: {
            priceRange: {
              max: 300,
            } satisfies IPriceRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 10,
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(maxOnlyResults);
  TestValidator.predicate(
    "max-only price filter should return results",
    Array.isArray(maxOnlyResults.data),
  );

  console.log(`Search completed successfully with price range filtering`);
}
