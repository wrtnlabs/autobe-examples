import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivityLog";
import type { IRedditPlatformUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reddit_platform_user_activity_logs_query_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Query with empty request (no filters) - should return all logs with pagination
  const emptyResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          // Empty request body for no filtering
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    emptyResult.pagination != null,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(emptyResult.data),
    true,
  );
  // Validate pagination properties
  TestValidator.equals(
    "current page is positive",
    emptyResult.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "limit is positive",
    emptyResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "records count is non-negative",
    emptyResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is non-negative",
    emptyResult.pagination.pages >= 0,
    true,
  );
  // Test 2: Query with user_id filter
  const userId = typia.random<string & tags.Format<"uuid">>();
  const userFilteredResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          user_id: userId,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(userFilteredResult);
  // Test 3: Query with community_id filter
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communityFilteredResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          community_id: communityId,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(communityFilteredResult);
  // Test 4: Query with post_id filter
  const postId = typia.random<string & tags.Format<"uuid">>();
  const postFilteredResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          post_id: postId,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(postFilteredResult);
  // Test 5: Query with comment_id filter
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const commentFilteredResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          comment_id: commentId,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(commentFilteredResult);
  // Test 6: Query with pagination parameters
  const paginatedResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          current: 1,
          limit: 10,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Test 7: Query with out-of-range pagination
  const outOfRangeResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          current: 999999,
          limit: 10,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(outOfRangeResult);
  // Test 8: Query with combined filters
  const combinedResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          user_id: userId,
          community_id: communityId,
          current: 1,
          limit: 5,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Test 9: Verify empty result handling
  const nonexistentUserId = typia.random<string & tags.Format<"uuid">>();
  const emptyFilterResult =
    await api.functional.redditPlatform.user_activity_logs.index(
      adminConnection,
      {
        body: {
          user_id: nonexistentUserId,
        } satisfies IRedditPlatformUserActivityLog.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  // Test 10: Verify data array structure when empty
  TestValidator.equals(
    "empty data array is array",
    Array.isArray(emptyFilterResult.data),
    true,
  );
}
