import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

/**
 * Test category search functionality with basic filtering parameters. Validates
 * that categories can be searched by name, filtered by status, and sorted by
 * various criteria within a specific community context. Tests pagination
 * functionality and proper handling of search parameters for efficient category
 * discovery.
 */
export async function test_api_community_category_search_basic_filtering(
  connection: api.IConnection,
) {
  // Generate a realistic community slug for testing
  const communitySlug = RandomGenerator.alphaNumeric(12);

  // Test 1: Basic search with text query
  const searchResult =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          search: RandomGenerator.paragraph({ sentences: 2 }),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search result should have pagination",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search result should have valid records count",
    searchResult.pagination.records >= 0,
  );

  // Test 2: Filter by different status values
  const statusFilterTest = async (
    status: "draft" | "active" | "archived" | "suspended",
  ) => {
    const filteredResult =
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
    typia.assert(filteredResult);
    TestValidator.predicate(
      "status filter should return valid pagination",
      filteredResult.pagination.limit === 5,
    );
  };

  await statusFilterTest("active");
  await statusFilterTest("draft");

  // Test 3: Filter by active status
  const activeFilterResult =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          is_active: true,
          page: 1,
          limit: 8,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(activeFilterResult);
  TestValidator.equals(
    "active filter limit should be 8",
    activeFilterResult.pagination.limit,
    8,
  );

  // Test 4: Test different page sizes
  const pageSizeTest = async (limit: number) => {
    const paginatedResult =
      await api.functional.communityPlatform.communities.categories.index(
        connection,
        {
          communitySlug,
          body: {
            page: 1,
            limit,
          } satisfies ICommunityPlatformCategory.IRequest,
        },
      );
    typia.assert(paginatedResult);
    TestValidator.equals(
      "limit should match requested size",
      paginatedResult.pagination.limit,
      limit,
    );
  };

  await pageSizeTest(5);
  await pageSizeTest(10);
  await pageSizeTest(20);

  // Test 5: Test sorting functionality
  const sortTest = async (
    orderBy: "name" | "display_name" | "sort_order" | "created_at" | "status",
    orderDirection: "asc" | "desc",
  ) => {
    const sortedResult =
      await api.functional.communityPlatform.communities.categories.index(
        connection,
        {
          communitySlug,
          body: {
            order_by: orderBy,
            order_direction: orderDirection,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformCategory.IRequest,
        },
      );
    typia.assert(sortedResult);
    TestValidator.predicate(
      "sorted result should have data array",
      Array.isArray(sortedResult.data),
    );
    TestValidator.predicate(
      "sorted result pagination should be valid",
      sortedResult.pagination.pages >= 0,
    );
  };

  await sortTest("name", "asc");
  await sortTest("created_at", "desc");

  // Test 6: Combined filtering with multiple parameters
  const combinedResult =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
          is_active: true,
          order_by: "created_at",
          order_direction: "desc",
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter should return valid pagination",
    combinedResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "combined filter limit should be 15",
    combinedResult.pagination.limit,
    15,
  );

  // Test 7: Edge case - empty search parameters
  const emptySearchResult =
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
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search should return valid result",
    emptySearchResult.pagination.records >= 0,
  );

  // Test 8: Error case testing - invalid page number
  await TestValidator.error("should reject invalid page number", async () => {
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: {
          page: 0, // Invalid - page must be >= 1
          limit: 10,
        } satisfies ICommunityPlatformCategory.IRequest,
      },
    );
  });
}
