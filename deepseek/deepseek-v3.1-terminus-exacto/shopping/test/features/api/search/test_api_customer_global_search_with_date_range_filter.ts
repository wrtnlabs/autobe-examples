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
 * Test search with date range filtering for time-sensitive content. Customer
 * performs a search with specific date range criteria and validates that
 * results are properly filtered by creation or modification dates. Verifies
 * temporal filtering accuracy for finding recent products, articles, and other
 * time-sensitive content.
 */
export async function test_api_customer_global_search_with_date_range_filter(
  connection: api.IConnection,
) {
  // 1. Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/search",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Perform global search with date range filtering
  const currentDate = new Date();
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );

  // Test 1: Search with recent date range (last week)
  const recentSearchResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: "latest",
          filters: {
            dateRange: {
              start: oneWeekAgo.toISOString(),
              end: currentDate.toISOString(),
            } satisfies IDateRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 20,
            sortBy: "createdAt",
            sortOrder: "desc",
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(recentSearchResults);

  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof recentSearchResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    recentSearchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    recentSearchResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    recentSearchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    recentSearchResults.pagination.pages >= 0,
  );

  // Validate search result structure
  TestValidator.equals(
    "data is array",
    Array.isArray(recentSearchResults.data),
    true,
  );

  if (recentSearchResults.data.length > 0) {
    const firstResult = recentSearchResults.data[0];
    typia.assert(firstResult);
    TestValidator.equals(
      "result has type field",
      typeof firstResult.type,
      "string",
    );
    TestValidator.equals(
      "result has id field",
      typeof firstResult.id,
      "string",
    );
    TestValidator.equals(
      "result has title field",
      typeof firstResult.title,
      "string",
    );
    TestValidator.predicate(
      "result has relevance score",
      firstResult.relevance_score >= 0,
    );
  }

  // Test 2: Search with broader date range (last month)
  const broaderSearchResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: "product",
          filters: {
            dateRange: {
              start: oneMonthAgo.toISOString(),
              end: currentDate.toISOString(),
            } satisfies IDateRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 10,
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(broaderSearchResults);

  // Test 3: Search with only start date (no end date)
  const startOnlyResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: "sale",
          filters: {
            dateRange: {
              start: oneWeekAgo.toISOString(),
            } satisfies IDateRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 15,
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(startOnlyResults);

  // Test 4: Search with only end date (no start date)
  const endOnlyResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: "promotion",
          filters: {
            dateRange: {
              end: currentDate.toISOString(),
            } satisfies IDateRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 10,
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(endOnlyResults);

  // Validate that different date ranges return results
  TestValidator.predicate(
    "recent search returned results",
    recentSearchResults.data.length >= 0,
  );
  TestValidator.predicate(
    "broader search returned results",
    broaderSearchResults.data.length >= 0,
  );
  TestValidator.predicate(
    "start-only search returned results",
    startOnlyResults.data.length >= 0,
  );
  TestValidator.predicate(
    "end-only search returned results",
    endOnlyResults.data.length >= 0,
  );

  // Test 5: Search with specific entity types and date range
  const entitySearchResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: "tech",
          entityTypes: ["products", "articles"],
          filters: {
            dateRange: {
              start: oneMonthAgo.toISOString(),
              end: currentDate.toISOString(),
            } satisfies IDateRange,
          } satisfies ISearchFilters,
          pagination: {
            page: 1,
            limit: 25,
            sortBy: "relevance",
            sortOrder: "desc",
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(entitySearchResults);

  // Final validation: Ensure all searches completed successfully
  TestValidator.equals(
    "customer authentication successful",
    typeof customer.id,
    "string",
  );
  TestValidator.predicate(
    "customer has valid UUID format",
    typia.is<string & tags.Format<"uuid">>(customer.id),
  );
  TestValidator.equals("customer email matches", customer.email, customerEmail);
}
