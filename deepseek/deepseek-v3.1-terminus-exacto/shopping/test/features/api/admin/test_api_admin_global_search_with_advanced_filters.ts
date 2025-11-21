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
 * Test advanced filtering capabilities for comprehensive administrative
 * searches. Administrator performs searches combining multiple filter criteria
 * including status filters, date ranges, and entity-specific attributes to
 * validate complex query handling. Verifies advanced filtering accuracy and
 * multi-criteria search capabilities for administrative reporting.
 */
export async function test_api_admin_global_search_with_advanced_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        can_search: true,
        can_view_all: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create comprehensive search request with advanced filters
  const searchRequest = {
    query: RandomGenerator.paragraph({ sentences: 2 }),
    entityTypes: ["products", "customers", "sellers"] as const,
    filters: {
      priceRange: {
        min: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        max: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<5000>
        >(),
      } satisfies IPriceRange,
      status: "active",
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      } satisfies IDateRange,
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      sellerId: typia.random<string & tags.Format<"uuid">>(),
      saleStatus: "completed",
      orderStatus: "delivered",
      promotionType: "percentage",
      articleType: "news",
      reviewRating: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<5>
      >(),
    } satisfies ISearchFilters,
    pagination: {
      page: 1,
      limit: 20,
      sortBy: "relevance",
      sortOrder: "desc" as const,
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  // Step 3: Execute global search with advanced filters
  const searchResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // Step 4: Validate search response structure
  TestValidator.equals(
    "search results should have pagination structure",
    searchResults.pagination,
    {
      current: 1,
      limit: 20,
      records: searchResults.pagination.records,
      pages: searchResults.pagination.pages,
    } satisfies IPage.IPagination,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResults.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "current page should be valid",
    searchResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be valid",
    searchResults.pagination.limit >= 0,
  );

  // Step 5: Validate individual search result items
  if (searchResults.data.length > 0) {
    const sampleResult = searchResults.data[0];
    typia.assert(sampleResult);

    TestValidator.predicate(
      "search result should have valid type",
      typeof sampleResult.type === "string" && sampleResult.type.length > 0,
    );

    TestValidator.predicate(
      "search result should have valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleResult.id,
      ),
    );

    TestValidator.predicate(
      "search result should have non-empty title",
      typeof sampleResult.title === "string" && sampleResult.title.length > 0,
    );

    TestValidator.predicate(
      "search result should have valid relevance score",
      typeof sampleResult.relevance_score === "number" &&
        sampleResult.relevance_score >= 0,
    );
  }

  // Step 6: Test empty search scenario
  const emptySearchRequest = {
    query: "",
    pagination: {
      page: 1,
      limit: 10,
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const emptySearchResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: emptySearchRequest,
    });
  typia.assert(emptySearchResults);

  TestValidator.equals(
    "empty search should return valid pagination",
    emptySearchResults.pagination,
    {
      current: 1,
      limit: 10,
      records: emptySearchResults.pagination.records,
      pages: emptySearchResults.pagination.pages,
    } satisfies IPage.IPagination,
  );

  // Step 7: Test pagination functionality
  const paginatedSearchRequest = {
    query: RandomGenerator.paragraph({ sentences: 1 }),
    pagination: {
      page: 2,
      limit: 5,
      sortBy: "title",
      sortOrder: "asc" as const,
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const paginatedResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: paginatedSearchRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.equals(
    "pagination should work correctly",
    paginatedResults.pagination.current,
    2,
  );

  TestValidator.equals(
    "pagination limit should be respected",
    paginatedResults.pagination.limit,
    5,
  );
}
