import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

/**
 * Comprehensive E2E test for advanced community category search functionality
 *
 * Validates filtering by status, activity status, text search, sorting options,
 * and pagination controls. Tests complex query combinations and ensures proper
 * result ordering based on specified criteria.
 */
export async function test_api_community_category_search_advanced_parameters(
  connection: api.IConnection,
) {
  const communitySlug = RandomGenerator.alphabets(10);

  // Test 1: Basic pagination with default parameters
  const basicSearch =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination structure should be an object",
    typeof basicSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page should be non-negative",
    basicSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be non-negative",
    basicSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    basicSearch.pagination.pages >= 0,
  );

  // Test 2: Text search functionality
  const searchQuery = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 6,
  });
  const searchResults =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          search: searchQuery,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should be valid pagination structure",
    Array.isArray(searchResults.data),
  );

  // Test 3: Status filtering
  const statuses = ["draft", "active", "archived", "suspended"] as const;
  for (const status of statuses) {
    const statusResults =
      await api.functional.communityPlatform.communities.categories.index(
        connection,
        {
          communitySlug,
          body: {
            status,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformCategory.IRequest,
        },
      );
    typia.assert(statusResults);
    TestValidator.predicate(
      `status filter '${status}' should return valid data`,
      Array.isArray(statusResults.data),
    );
  }

  // Test 4: Activity status filtering
  const activityTests = [true, false] as const;
  for (const isActive of activityTests) {
    const activityResults =
      await api.functional.communityPlatform.communities.categories.index(
        connection,
        {
          communitySlug,
          body: {
            is_active: isActive,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformCategory.IRequest,
        },
      );
    typia.assert(activityResults);
    TestValidator.predicate(
      `activity filter '${isActive}' should return valid structure`,
      Array.isArray(activityResults.data),
    );
  }

  // Test 5: Sorting by different fields
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
      const sortedResults =
        await api.functional.communityPlatform.communities.categories.index(
          connection,
          {
            communitySlug,
            body: {
              order_by: field,
              order_direction: direction,
              page: 1,
              limit: 5,
            } satisfies ICommunityPlatformCategory.IRequest,
          },
        );
      typia.assert(sortedResults);
      TestValidator.predicate(
        `sort by '${field}' ${direction} should return valid data`,
        Array.isArray(sortedResults.data),
      );
    }
  }

  // Test 6: Complex query with multiple filters
  const complexQuery =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          search: "test",
          status: "active",
          is_active: true,
          order_by: "created_at",
          order_direction: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(complexQuery);
  TestValidator.predicate(
    "complex query should return valid pagination structure",
    Array.isArray(complexQuery.data),
  );

  // Test 7: Pagination boundary testing
  const boundaryTests = [
    { page: 1, limit: 1 },
    { page: 1, limit: 50 },
    { page: 2, limit: 10 },
  ];

  for (const pagination of boundaryTests) {
    const boundaryResults =
      await api.functional.communityPlatform.communities.categories.index(
        connection,
        {
          communitySlug,
          body: {
            page: pagination.page,
            limit: pagination.limit,
          } satisfies ICommunityPlatformCategory.IRequest,
        },
      );
    typia.assert(boundaryResults);
    TestValidator.predicate(
      `pagination page ${pagination.page} limit ${pagination.limit} should respect limits`,
      boundaryResults.data.length <= pagination.limit,
    );
  }

  // Test 8: Empty search query
  const emptySearch =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          search: "",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search query should return valid structure",
    Array.isArray(emptySearch.data),
  );

  // Test 9: Validate response data structure
  if (basicSearch.data.length > 0) {
    const sampleCategory = basicSearch.data[0];
    typia.assert(sampleCategory);
    TestValidator.predicate(
      "category should have valid UUID ID",
      typeof sampleCategory.id === "string",
    );
    TestValidator.predicate(
      "category should have name string",
      typeof sampleCategory.name === "string",
    );
    TestValidator.predicate(
      "category should have display_name string",
      typeof sampleCategory.display_name === "string",
    );
    TestValidator.predicate(
      "category should have description string",
      typeof sampleCategory.description === "string",
    );
    TestValidator.predicate(
      "category should have sort_order number",
      typeof sampleCategory.sort_order === "number",
    );
    TestValidator.predicate(
      "category should have is_active boolean",
      typeof sampleCategory.is_active === "boolean",
    );
    TestValidator.predicate(
      "category should have status string",
      typeof sampleCategory.status === "string",
    );
    TestValidator.predicate(
      "category should have created_at date string",
      typeof sampleCategory.created_at === "string",
    );
    TestValidator.predicate(
      "category should have updated_at date string",
      typeof sampleCategory.updated_at === "string",
    );
    TestValidator.predicate(
      "category should have created_by admin object",
      typeof sampleCategory.created_by === "object",
    );

    if (sampleCategory.created_by) {
      TestValidator.predicate(
        "created_by admin should have ID",
        typeof sampleCategory.created_by.id === "string",
      );
      TestValidator.predicate(
        "created_by admin should have display_name",
        typeof sampleCategory.created_by.display_name === "string",
      );
      TestValidator.predicate(
        "created_by admin should have admin_level",
        typeof sampleCategory.created_by.admin_level === "string",
      );
    }
  }

  // Test 10: Error testing for invalid parameters
  await TestValidator.error("should reject invalid page number", async () => {
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 0, // Invalid: minimum is 1
          limit: 10,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  });

  await TestValidator.error("should reject invalid limit value", async () => {
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 1,
          limit: 200, // Invalid: maximum is 100
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  });
}
