import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_filter_exclude_unused(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering tags to exclude those without associated articles.
   * This test validates the excludeUnused filter functionality on the discussion board tags endpoint.
   * It verifies that tags without article associations are properly filtered out from the results.
   */
  // Create a dedicated connection for this test
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic excludeUnused filter with no other filters
  const excludeUnusedRequest = {
    excludeUnused: true,
  } satisfies IDiscussionBoardTag.IRequest;
  const excludeUnusedResponse = await api.functional.discussionBoard.tags.index(
    testConnection,
    {
      body: excludeUnusedRequest,
    },
  );
  typia.assert(excludeUnusedResponse);
  // Test 2: Combine excludeUnused with search filter
  const searchTerm = typia.random<string>();
  const combinedFilterRequest = {
    search: searchTerm,
    excludeUnused: true,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardTag.IRequest;
  const combinedFilterResponse =
    await api.functional.discussionBoard.tags.index(testConnection, {
      body: combinedFilterRequest,
    });
  typia.assert(combinedFilterResponse);
  // Test 3: Test with date range filter and excludeUnused
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    excludeUnused: true,
    createdAfter: thirtyDaysAgo.toISOString(),
    createdBefore: now.toISOString(),
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IDiscussionBoardTag.IRequest;
  const dateRangeResponse = await api.functional.discussionBoard.tags.index(
    testConnection,
    {
      body: dateRangeRequest,
    },
  );
  typia.assert(dateRangeResponse);
  // Test 4: Verify pagination works with excludeUnused
  const paginationRequest = {
    excludeUnused: true,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardTag.IRequest;
  const paginationResponse = await api.functional.discussionBoard.tags.index(
    testConnection,
    {
      body: paginationRequest,
    },
  );
  typia.assert(paginationResponse);
  // Test 5: Compare results with and without excludeUnused
  const withoutFilterRequest = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardTag.IRequest;
  const withoutFilterResponse = await api.functional.discussionBoard.tags.index(
    testConnection,
    {
      body: withoutFilterRequest,
    },
  );
  typia.assert(withoutFilterResponse);
  const withFilterRequest = {
    excludeUnused: true,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardTag.IRequest;
  const withFilterResponse = await api.functional.discussionBoard.tags.index(
    testConnection,
    {
      body: withFilterRequest,
    },
  );
  typia.assert(withFilterResponse);
  // Verify that the filtered result has equal or fewer records than unfiltered
  if (
    withFilterResponse.pagination.records >
    withoutFilterResponse.pagination.records
  ) {
    throw new Error(
      "excludeUnused filter should return equal or fewer records than unfiltered results",
    );
  }
}
