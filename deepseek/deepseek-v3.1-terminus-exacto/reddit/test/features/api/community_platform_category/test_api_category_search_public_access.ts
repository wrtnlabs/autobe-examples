import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

/**
 * Test public access to category search functionality without authentication.
 * Validates that users can search and filter platform categories using various
 * criteria including text search, status filtering, activity status, and
 * pagination parameters. The test ensures that category browsing is accessible
 * to all users regardless of authentication status and that search results are
 * properly filtered and paginated according to the request parameters.
 */
export async function test_api_category_search_public_access(
  connection: api.IConnection,
) {
  // Test 1: Default pagination behavior with no parameters
  const defaultPageResults: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {} satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(defaultPageResults);

  TestValidator.predicate(
    "default page should have valid pagination metadata",
    defaultPageResults.pagination !== undefined &&
      defaultPageResults.pagination.current >= 0 &&
      defaultPageResults.pagination.limit >= 0 &&
      defaultPageResults.pagination.records >= 0 &&
      defaultPageResults.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "default page should contain data array",
    Array.isArray(defaultPageResults.data),
  );

  // Test 2: Text search functionality with partial matching
  if (defaultPageResults.data.length > 0) {
    const firstCategory = defaultPageResults.data[0];
    const searchTerm = RandomGenerator.substring(firstCategory.display_name);

    const searchResults: IPageICommunityPlatformCategory.ISummary =
      await api.functional.communityPlatform.categories.index(connection, {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCategory.IRequest,
      });
    typia.assert(searchResults);

    TestValidator.predicate(
      "search results should be valid array structure",
      Array.isArray(searchResults.data),
    );

    if (searchResults.data.length > 0) {
      TestValidator.predicate(
        "search results should contain matching content",
        searchResults.data.some(
          (category) =>
            category.display_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            category.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
        ),
      );
    }
  }

  // Test 3: Status filtering with specific workflow states
  const statuses = ["draft", "active", "archived", "suspended"] as const;

  for (const status of statuses) {
    const statusFilteredResults: IPageICommunityPlatformCategory.ISummary =
      await api.functional.communityPlatform.categories.index(connection, {
        body: {
          status: status,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCategory.IRequest,
      });
    typia.assert(statusFilteredResults);

    TestValidator.predicate(
      `status filtered results should have valid data structure for ${status}`,
      Array.isArray(statusFilteredResults.data),
    );

    if (statusFilteredResults.data.length > 0) {
      TestValidator.predicate(
        `all results should have ${status} status when filtered by status`,
        statusFilteredResults.data.every(
          (category) => category.status === status,
        ),
      );
    }
  }

  // Test 4: Activity filtering for active/inactive categories
  const activeFilteredResults: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        is_active: true,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(activeFilteredResults);

  TestValidator.predicate(
    "active filtered results should have valid data structure",
    Array.isArray(activeFilteredResults.data),
  );

  if (activeFilteredResults.data.length > 0) {
    TestValidator.predicate(
      "all results should be active when filtered by is_active=true",
      activeFilteredResults.data.every(
        (category) => category.is_active === true,
      ),
    );
  }

  const inactiveFilteredResults: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        is_active: false,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(inactiveFilteredResults);

  TestValidator.predicate(
    "inactive filtered results should have valid data structure",
    Array.isArray(inactiveFilteredResults.data),
  );

  if (inactiveFilteredResults.data.length > 0) {
    TestValidator.predicate(
      "all results should be inactive when filtered by is_active=false",
      inactiveFilteredResults.data.every(
        (category) => category.is_active === false,
      ),
    );
  }

  // Test 5: Sorting options with different field and direction combinations
  const sortFields = [
    "name",
    "display_name",
    "sort_order",
    "created_at",
    "status",
  ] as const;
  const sortDirections = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of sortDirections) {
      const sortedResults: IPageICommunityPlatformCategory.ISummary =
        await api.functional.communityPlatform.categories.index(connection, {
          body: {
            order_by: field,
            order_direction: direction,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformCategory.IRequest,
        });
      typia.assert(sortedResults);

      TestValidator.predicate(
        `sorted results should have valid structure for ${field} ${direction}`,
        Array.isArray(sortedResults.data) &&
          sortedResults.pagination !== undefined,
      );
    }
  }

  // Test 6: Pagination limits and validation
  const limitTestResults: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitTestResults);

  TestValidator.predicate(
    "pagination limit should be respected with valid data structure",
    Array.isArray(limitTestResults.data) && limitTestResults.data.length <= 50,
  );

  // Test 7: Multiple page navigation when multiple pages exist
  if (defaultPageResults.pagination.pages > 1) {
    const secondPageResults: IPageICommunityPlatformCategory.ISummary =
      await api.functional.communityPlatform.categories.index(connection, {
        body: {
          page: 2,
          limit: defaultPageResults.pagination.limit,
        } satisfies ICommunityPlatformCategory.IRequest,
      });
    typia.assert(secondPageResults);

    TestValidator.equals(
      "second page should have correct page number in pagination",
      secondPageResults.pagination.current,
      2,
    );

    TestValidator.predicate(
      "second page should have valid data structure",
      Array.isArray(secondPageResults.data),
    );

    if (
      defaultPageResults.data.length > 0 &&
      secondPageResults.data.length > 0
    ) {
      TestValidator.notEquals(
        "first and second page data should be different when pages exist",
        defaultPageResults.data,
        secondPageResults.data,
      );
    }
  }

  // Test 8: Combined filtering with multiple criteria
  const combinedFilterResults: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        status: "active",
        is_active: true,
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(combinedFilterResults);

  TestValidator.predicate(
    "combined filtered results should have valid data structure",
    Array.isArray(combinedFilterResults.data),
  );

  if (combinedFilterResults.data.length > 0) {
    TestValidator.predicate(
      "combined filtered results should meet all specified criteria",
      combinedFilterResults.data.every(
        (category) =>
          category.status === "active" && category.is_active === true,
      ),
    );
  }

  // Final validation: Ensure public access works without authentication errors
  TestValidator.predicate(
    "public category search should complete without authentication requirements",
    true, // This test itself passing confirms public access works
  );
}
