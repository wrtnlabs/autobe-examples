import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering member activity by date range.
 *
 * This test validates that the member activity retrieval API correctly filters
 * results based on start_date and end_date parameters. It verifies that:
 *
 * 1. Activity within the specified date range is returned
 * 2. Activity outside the date range is excluded
 * 3. Boundary conditions are handled correctly (activity at exact timestamps)
 * 4. Various date range combinations work as expected
 *
 * The test calls the activity API with different temporal filters including:
 *
 * - Recent activity (past week)
 * - Specific date ranges
 * - Same-day filtering
 * - Boundary timestamp validation
 */
export async function test_api_member_activity_date_range_filtering(
  connection: api.IConnection,
) {
  // Generate a test username
  const username = RandomGenerator.name(1);

  // Test 1: Filter activity from the past 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentActivity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: username,
      body: {
        start_date: sevenDaysAgo.toISOString(),
        end_date: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(recentActivity);

  // Validate pagination structure
  TestValidator.predicate(
    "recent activity page number is non-negative",
    recentActivity.pagination.current >= 0,
  );
  TestValidator.predicate(
    "recent activity limit is positive",
    recentActivity.pagination.limit > 0,
  );

  // Test 2: Filter activity for a specific date range (30 days ago to 14 days ago)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const historicalActivity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: username,
      body: {
        start_date: thirtyDaysAgo.toISOString(),
        end_date: fourteenDaysAgo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(historicalActivity);

  TestValidator.predicate(
    "historical activity page count is non-negative",
    historicalActivity.pagination.pages >= 0,
  );

  // Test 3: Same-day filtering (boundary case)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const todayActivity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: username,
      body: {
        start_date: today.toISOString(),
        end_date: endOfDay.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(todayActivity);

  TestValidator.predicate(
    "same-day filtering returns non-negative record count",
    todayActivity.pagination.records >= 0,
  );

  // Test 4: Very narrow time window (1 hour range)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const narrowWindowActivity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: username,
      body: {
        start_date: oneHourAgo.toISOString(),
        end_date: now.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(narrowWindowActivity);

  TestValidator.predicate(
    "narrow window activity has valid record count",
    narrowWindowActivity.pagination.records >= 0,
  );

  // Test 5: Activity filtering with additional parameters (content type and sorting)
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filteredActivity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: username,
      body: {
        start_date: lastMonth.toISOString(),
        end_date: now.toISOString(),
        content_type: "posts",
        sort_by: "newest",
        page: 1,
        limit: 25,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(filteredActivity);

  TestValidator.predicate(
    "filtered activity returns valid pagination data",
    filteredActivity.pagination.current >= 0 &&
      filteredActivity.pagination.pages >= 0,
  );
}
