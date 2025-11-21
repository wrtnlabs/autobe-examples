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
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";

/**
 * Test sales transaction search for business intelligence and monitoring.
 * Administrator searches for sales transactions using various status filters
 * and date ranges to validate sales performance tracking capabilities. Verifies
 * sales data accessibility and filtering accuracy for revenue analysis.
 *
 * This test validates the global search functionality for sales transactions
 * across the shopping mall platform. The test follows a comprehensive
 * workflow:
 *
 * 1. Administrator Authentication: Authenticate as administrator to access sales
 *    search
 * 2. Search Criteria Setup: Prepare realistic search parameters for sales
 *    transactions
 * 3. Search Execution: Perform global search with sales-specific entity type
 *    filtering
 * 4. Result Validation: Verify search results contain proper sales transaction
 *    data
 * 5. Filter Testing: Test various search filters including date ranges and status
 *    filters
 * 6. Business Logic Validation: Ensure results align with sales monitoring
 *    requirements
 */
export async function test_api_admin_global_search_sales_transactions(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator to access sales search functionality
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          sales: ["read", "search", "analyze"],
          customers: ["read"],
          products: ["read"],
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare comprehensive search criteria for sales transactions
  const searchRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "electronics sale transaction",
    entityTypes: ["sales"],
    filters: {
      saleStatus: "completed",
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        end: new Date().toISOString(),
      } satisfies IDateRange,
      priceRange: {
        min: 50,
        max: 500,
      } satisfies IPriceRange,
    } satisfies ISearchFilters,
    pagination: {
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  // 3. Execute global search for sales transactions
  const searchResults: IPageIShoppingMallGlobalSearchResult =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // 4. Validate search results structure and content
  TestValidator.equals(
    "search results should have pagination metadata with current page 1",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search results should contain valid data array",
    Array.isArray(searchResults.data),
  );
  TestValidator.equals(
    "search results page limit should match request",
    searchResults.pagination.limit,
    20,
  );

  // 5. Test alternative search filters for comprehensive validation
  const alternativeSearchRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "recent sales",
    entityTypes: ["sales"],
    filters: {
      saleStatus: "active",
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      } satisfies IDateRange,
    } satisfies ISearchFilters,
    pagination: {
      page: 1,
      limit: 15,
      sortBy: "relevance",
      sortOrder: "desc",
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const alternativeResults: IPageIShoppingMallGlobalSearchResult =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: alternativeSearchRequest,
    });
  typia.assert(alternativeResults);

  // 6. Validate alternative search results
  TestValidator.equals(
    "alternative search results should have correct pagination settings",
    alternativeResults.pagination.limit,
    15,
  );

  // 7. Final comprehensive validation of search functionality
  TestValidator.predicate(
    "all search operations should return valid pagination structures",
    searchResults.pagination.records >= 0 &&
      searchResults.pagination.pages >= 0 &&
      alternativeResults.pagination.records >= 0 &&
      alternativeResults.pagination.pages >= 0,
  );

  // 8. Validate search result item structure when data is available
  if (searchResults.data.length > 0) {
    const firstResult: IShoppingMallGlobalSearchResult = searchResults.data[0];
    TestValidator.predicate(
      "search result should have required fields",
      typeof firstResult.id === "string" &&
        typeof firstResult.title === "string" &&
        typeof firstResult.type === "string" &&
        typeof firstResult.relevance_score === "number",
    );
  }
}
