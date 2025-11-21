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
 * Test order search functionality for customer service and fulfillment
 * tracking.
 *
 * Administrator searches for customer orders using status filters and tracking
 * information to validate order management capabilities. Verifies order data
 * accessibility and filtering accuracy for customer service operations.
 */
export async function test_api_admin_global_search_order_management(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({
          order_management: true,
          customer_service: true,
          search_access: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Perform global search for orders with realistic criteria
  const searchRequest = {
    query: "recent orders pending fulfillment",
    entityTypes: ["orders"],
    filters: {
      orderStatus: "pending",
    } satisfies ISearchFilters,
    pagination: {
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  // Step 3: Execute global search
  const searchResults: IPageIShoppingMallGlobalSearchResult =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // Step 4: Validate search response structure
  TestValidator.equals(
    "search results should have pagination metadata",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search results should have valid limit",
    searchResults.pagination.limit >= 1 &&
      searchResults.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "search results should have non-negative records count",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search results should have valid pages count",
    searchResults.pagination.pages >= 0,
  );

  // Step 5: Validate search result data structure
  if (searchResults.data.length > 0) {
    const firstResult = searchResults.data[0];
    typia.assert(firstResult);

    TestValidator.predicate(
      "search result should have valid type",
      firstResult.type.length > 0,
    );
    TestValidator.predicate(
      "search result should have valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstResult.id,
      ),
    );
    TestValidator.predicate(
      "search result should have title",
      firstResult.title.length > 0,
    );
    TestValidator.predicate(
      "search result should have valid relevance score",
      firstResult.relevance_score >= 0,
    );
  }

  // Step 6: Test search with different status filter for fulfillment tracking
  const fulfillmentSearch = {
    query: "shipped deliveries tracking",
    entityTypes: ["orders"],
    filters: {
      orderStatus: "shipped",
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      } satisfies IDateRange,
    } satisfies ISearchFilters,
    pagination: {
      page: 1,
      limit: 10,
      sortBy: "updatedAt",
      sortOrder: "desc",
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const fulfillmentResults: IPageIShoppingMallGlobalSearchResult =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: fulfillmentSearch,
    });
  typia.assert(fulfillmentResults);

  // Validate fulfillment search results
  TestValidator.predicate(
    "fulfillment search should return valid pagination",
    fulfillmentResults.pagination.pages >= 0 &&
      fulfillmentResults.pagination.records >= 0,
  );

  // Step 7: Test empty search scenario
  const emptySearch = {
    query: "",
    entityTypes: ["orders"],
    pagination: {
      page: 1,
      limit: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const emptyResults: IPageIShoppingMallGlobalSearchResult =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: emptySearch,
    });
  typia.assert(emptyResults);

  TestValidator.predicate(
    "empty search should return valid response structure",
    emptyResults.pagination.records >= 0 && emptyResults.pagination.pages >= 0,
  );
}
