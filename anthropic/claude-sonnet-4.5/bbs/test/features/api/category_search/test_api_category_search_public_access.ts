import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test public access to category search functionality without authentication.
 *
 * This test validates that guest users can search and retrieve discussion board
 * categories without requiring authentication. It tests the category taxonomy's
 * public accessibility for content discovery purposes.
 *
 * Test workflow:
 *
 * 1. Perform basic category search with default parameters
 * 2. Test keyword search functionality across category names and descriptions
 * 3. Validate pagination with various page and limit parameters
 * 4. Test sorting options (by name, created_at) in ascending and descending order
 * 5. Verify response structure matches expected types
 * 6. Validate pagination metadata correctness
 */
export async function test_api_category_search_public_access(
  connection: api.IConnection,
) {
  // Test 1: Basic search with empty/minimal request
  const basicRequest = {} satisfies IDiscussionBoardCategory.IRequest;
  const basicResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: basicRequest,
    });
  typia.assert(basicResponse);

  // Test 2: Keyword search
  const searchRequest = {
    search: "economic",
  } satisfies IDiscussionBoardCategory.IRequest;
  const searchResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResponse);

  // Test 3: Pagination with specific page and limit
  const paginationRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardCategory.IRequest;
  const paginationResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: paginationRequest,
    });
  typia.assert(paginationResponse);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginationResponse.data.length <= 10,
  );

  // Test 4: Sorting by name in ascending order
  const sortAscRequest = {
    sort_by: "name",
    sort_order: "asc",
  } satisfies IDiscussionBoardCategory.IRequest;
  const sortAscResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: sortAscRequest,
    });
  typia.assert(sortAscResponse);

  // Test 5: Sorting by created_at in descending order
  const sortDescRequest = {
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardCategory.IRequest;
  const sortDescResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: sortDescRequest,
    });
  typia.assert(sortDescResponse);

  // Test 6: Name filter
  const nameFilterRequest = {
    name: "Policy",
  } satisfies IDiscussionBoardCategory.IRequest;
  const nameFilterResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: nameFilterRequest,
    });
  typia.assert(nameFilterResponse);

  // Test 7: Date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    created_after: thirtyDaysAgo.toISOString(),
    created_before: now.toISOString(),
  } satisfies IDiscussionBoardCategory.IRequest;
  const dateRangeResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResponse);

  // Test 8: Combined filters - search, pagination, and sorting
  const combinedRequest = {
    search: "analysis",
    page: 1,
    limit: 5,
    sort_by: "name",
    sort_order: "asc",
  } satisfies IDiscussionBoardCategory.IRequest;
  const combinedResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: combinedRequest,
    });
  typia.assert(combinedResponse);

  // Validate combined response
  TestValidator.equals(
    "combined request pagination current",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined request pagination limit",
    combinedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined response data does not exceed limit",
    combinedResponse.data.length <= 5,
  );

  // Test 9: Slug filter
  const slugFilterRequest = {
    slug: "economic-policy",
  } satisfies IDiscussionBoardCategory.IRequest;
  const slugFilterResponse: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: slugFilterRequest,
    });
  typia.assert(slugFilterResponse);
}
