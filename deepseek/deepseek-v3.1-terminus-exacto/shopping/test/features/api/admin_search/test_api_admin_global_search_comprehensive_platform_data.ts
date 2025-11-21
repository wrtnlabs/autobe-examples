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
 * Comprehensive global search test for administrative users across all platform
 * entities
 *
 * Validates that administrators can perform comprehensive searches across the
 * shopping mall platform. Tests various search scenarios including text
 * queries, entity filtering, advanced filters with price ranges and date
 * ranges, and pagination controls. Ensures proper authorization-based result
 * filtering and comprehensive platform data access for administrative users.
 */
export async function test_api_admin_global_search_comprehensive_platform_data(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 7,
      }),
      last_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 7,
      }),
      role: "super_admin",
      permissions: JSON.stringify({ access_level: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test basic text search across all entity types (no entity type filter)
  const basicSearchResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "test",
        pagination: {
          page: 1,
          limit: 20,
          sortBy: "relevance",
          sortOrder: "desc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(basicSearchResults);
  TestValidator.equals(
    "basic search returns pagination structure",
    typeof basicSearchResults.pagination,
    "object",
  );
  TestValidator.equals(
    "basic search returns data array",
    Array.isArray(basicSearchResults.data),
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    basicSearchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicSearchResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    basicSearchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    basicSearchResults.pagination.pages >= 0,
  );

  // Step 3: Test entity-specific search filtering with valid entity types
  const validEntityTypes = [
    "products",
    "customers",
    "sellers",
    "articles",
  ] as const;
  for (const entityType of validEntityTypes) {
    const entitySearchResults =
      await api.functional.shoppingMall.admin.search.global.search(connection, {
        body: {
          query: "search",
          entityTypes: [entityType],
          pagination: {
            page: 1,
            limit: 10,
            sortBy: "title",
            sortOrder: "asc",
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      });
    typia.assert(entitySearchResults);
    TestValidator.predicate(
      `${entityType} search returns valid pagination`,
      entitySearchResults.pagination.current >= 0,
    );
  }

  // Step 4: Test advanced filtering with price range (for product searches)
  const priceFilterResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "product",
        entityTypes: ["products"],
        filters: {
          priceRange: {
            min: 10,
            max: 1000,
          } satisfies IPriceRange,
        } satisfies ISearchFilters,
        pagination: {
          page: 1,
          limit: 15,
          sortBy: "price",
          sortOrder: "asc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(priceFilterResults);

  // Step 5: Test date range filtering
  const dateFilterResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "recent",
        filters: {
          dateRange: {
            start: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 30 days ago
            end: new Date().toISOString(),
          } satisfies IDateRange,
        } satisfies ISearchFilters,
        pagination: {
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(dateFilterResults);

  // Step 6: Test pagination with different page sizes
  const paginationTestResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "item",
        pagination: {
          page: 2,
          limit: 5,
          sortBy: "title",
          sortOrder: "asc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(paginationTestResults);
  TestValidator.predicate(
    "pagination returns valid page info",
    paginationTestResults.pagination.current === 2,
  );

  // Step 7: Test empty query scenario
  const emptyQueryResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "",
        pagination: {
          page: 1,
          limit: 10,
          sortBy: "relevance",
          sortOrder: "desc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(emptyQueryResults);
  TestValidator.predicate(
    "empty query returns valid structure",
    typeof emptyQueryResults.pagination === "object",
  );

  // Step 8: Test search with multiple entity types
  const multiEntityResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "admin",
        entityTypes: ["customers", "sellers", "articles"],
        pagination: {
          page: 1,
          limit: 25,
          sortBy: "relevance",
          sortOrder: "desc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(multiEntityResults);

  // Step 9: Validate search result structure
  if (basicSearchResults.data.length > 0) {
    const sampleResult = basicSearchResults.data[0];
    TestValidator.equals(
      "result has type field",
      typeof sampleResult.type,
      "string",
    );
    TestValidator.equals(
      "result has id field",
      typeof sampleResult.id,
      "string",
    );
    TestValidator.equals(
      "result has title field",
      typeof sampleResult.title,
      "string",
    );
    TestValidator.equals(
      "result has relevance_score field",
      typeof sampleResult.relevance_score,
      "number",
    );

    // Validate UUID format for ID field
    TestValidator.predicate(
      "result ID is valid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleResult.id,
      ),
    );
  }

  // Step 10: Test search with status filtering (using valid status filter)
  const statusFilterResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "sale",
        entityTypes: ["sales"],
        filters: {
          status: "active",
        } satisfies ISearchFilters,
        pagination: {
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(statusFilterResults);

  // Step 11: Test review rating filtering
  const ratingFilterResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "review",
        entityTypes: ["reviews"],
        filters: {
          reviewRating: 5,
        } satisfies ISearchFilters,
        pagination: {
          page: 1,
          limit: 10,
          sortBy: "relevance",
          sortOrder: "desc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(ratingFilterResults);

  // Step 12: Test article type filtering
  const articleFilterResults =
    await api.functional.shoppingMall.admin.search.global.search(connection, {
      body: {
        query: "article",
        entityTypes: ["articles"],
        filters: {
          articleType: "news",
        } satisfies ISearchFilters,
        pagination: {
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IPagination,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(articleFilterResults);
}
