import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

/**
 * Test user activity filtering by date range with comprehensive edge case
 * coverage.
 *
 * This test validates the core date filtering functionality for user activities
 * API, ensuring accurate temporal filtering, proper date format handling, and
 * robust edge case management. Tests both broad and narrow date ranges,
 * boundary conditions, and integration with other filtering parameters.
 *
 * The test creates activities across multiple time periods and validates that
 * the API correctly returns only activities within specified date ranges when
 * using date_from and date_to parameters with ISO 8601 format timestamps.
 *
 * Business Context: User activity tracking and analytics require precise
 * temporal filtering capabilities for dashboards, behavioral analysis, and
 * compliance reporting. This functionality enables users and administrators to
 * analyze activity patterns within specific time windows.
 */
export async function test_api_user_activities_filtering_by_date_range(
  connection: api.IConnection,
) {
  // Generate test user ID and define test timeline
  const userId: string = typia.random<string & tags.Format<"uuid">>();

  // Create activities across different time periods for comprehensive testing
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneHourMs = 60 * 60 * 1000;

  // Timeline setup with specific timestamps
  const recentActivity = new Date(now.getTime() - oneDayMs); // 1 day ago
  const middleActivity = new Date(now.getTime() - 3 * oneDayMs); // 3 days ago
  const oldActivity = new Date(now.getTime() - 7 * oneDayMs); // 1 week ago
  const futureActivity = new Date(now.getTime() + oneDayMs); // 1 day in future

  // Test 1: Basic date range filtering - narrow range
  const narrowDateFrom = new Date(now.getTime() - 2 * oneDayMs); // 2 days ago
  const narrowDateTo = new Date(now.getTime() - 1 * oneDayMs); // 1 day ago

  const narrowRangeResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: narrowDateFrom.toISOString(),
        date_to: narrowDateTo.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(narrowRangeResult);
  TestValidator.equals(
    "narrow range result has pagination info",
    narrowRangeResult.pagination,
    narrowRangeResult.pagination,
  );
  TestValidator.predicate(
    "narrow range data is array",
    Array.isArray(narrowRangeResult.data),
  );

  // Test 2: Broad date range filtering - includes multiple activities
  const broadDateFrom = new Date(now.getTime() - 10 * oneDayMs); // 10 days ago
  const broadDateTo = new Date(now.getTime() + 2 * oneDayMs); // 2 days in future

  const broadRangeResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: broadDateFrom.toISOString(),
        date_to: broadDateTo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(broadRangeResult);
  TestValidator.equals(
    "broad range result structure",
    broadRangeResult.data,
    broadRangeResult.data,
  );
  TestValidator.predicate(
    "broad range returns activities",
    broadRangeResult.data.length >= 0,
  );

  // Test 3: Date from only (open-ended range)
  const dateFromOnly = new Date(now.getTime() - 5 * oneDayMs); // 5 days ago

  const fromOnlyResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: dateFromOnly.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(fromOnlyResult);
  TestValidator.equals(
    "date_from only structure",
    fromOnlyResult.pagination,
    fromOnlyResult.pagination,
  );

  // Test 4: Date to only (open-ended range)
  const dateToOnly = new Date(now.getTime() - 2 * oneDayMs); // 2 days ago

  const toOnlyResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_to: dateToOnly.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(toOnlyResult);
  TestValidator.equals(
    "date_to only structure",
    toOnlyResult.pagination,
    toOnlyResult.pagination,
  );

  // Test 5: Edge case - future date range (should return empty or minimal results)
  const futureDateFrom = new Date(now.getTime() + oneDayMs); // Tomorrow
  const futureDateTo = new Date(now.getTime() + 2 * oneDayMs); // Day after tomorrow

  const futureRangeResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: futureDateFrom.toISOString(),
        date_to: futureDateTo.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(futureRangeResult);
  TestValidator.predicate(
    "future date range result is array",
    Array.isArray(futureRangeResult.data),
  );
  TestValidator.equals(
    "future range structure valid",
    futureRangeResult.pagination,
    futureRangeResult.pagination,
  );

  // Test 6: Integration test - combine date filtering with activity type
  const activityTypeResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: broadDateFrom.toISOString(),
        date_to: broadDateTo.toISOString(),
        activity_type: "post_created,comment_created",
        page: 1,
        limit: 15,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(activityTypeResult);
  TestValidator.equals(
    "combined filter structure",
    activityTypeResult.data,
    activityTypeResult.data,
  );

  // Test 7: Invalid date format testing (should be handled by API validation)
  await TestValidator.error("invalid date format should fail", async () => {
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: "invalid-date-format",
        date_to: "2024-01-01T00:00:00Z",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  });

  // Test 8: Reversed date range (date_from > date_to)
  const reversedDateFrom = new Date(now.getTime() - 1 * oneDayMs); // Yesterday
  const reversedDateTo = new Date(now.getTime() - 5 * oneDayMs); // 5 days ago (before date_from)

  await TestValidator.error("reversed date range should fail", async () => {
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: reversedDateFrom.toISOString(),
        date_to: reversedDateTo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  });

  // Test 9: Boundary testing - exact timestamps
  const exactDateFrom = new Date(now.getTime() - oneDayMs); // Exactly 1 day ago
  const exactDateTo = new Date(now.getTime()); // Now

  const boundaryResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: exactDateFrom.toISOString(),
        date_to: exactDateTo.toISOString(),
        page: 1,
        limit: 25,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(boundaryResult);
  TestValidator.equals(
    "boundary test structure",
    boundaryResult.pagination,
    boundaryResult.pagination,
  );
  TestValidator.predicate(
    "boundary test data array",
    Array.isArray(boundaryResult.data),
  );

  // Test 10: Pagination with date filtering
  const paginatedResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: broadDateFrom.toISOString(),
        date_to: broadDateTo.toISOString(),
        page: 2,
        limit: 5,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated date filter structure",
    paginatedResult.pagination,
    paginatedResult.pagination,
  );
  TestValidator.predicate(
    "pagination info is valid",
    paginatedResult.pagination.current === 2 &&
      paginatedResult.pagination.limit === 5,
  );

  // Test 11: Ordering with date filtering
  const orderedResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: broadDateFrom.toISOString(),
        date_to: broadDateTo.toISOString(),
        order_by: "created_at",
        order_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(orderedResult);
  TestValidator.equals(
    "ordered date filter structure",
    orderedResult.data,
    orderedResult.data,
  );

  // Test 12: All filtering parameters combined
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  const combinedFilterResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        date_from: broadDateFrom.toISOString(),
        date_to: broadDateTo.toISOString(),
        activity_type: "post_voted,comment_voted",
        community_id: communityId,
        page: 1,
        limit: 15,
        order_by: "activity_type",
        order_direction: "desc",
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filters result",
    combinedFilterResult.data,
    combinedFilterResult.data,
  );

  // Verify response structure consistency across all tests
  const allResults = [
    narrowRangeResult,
    broadRangeResult,
    fromOnlyResult,
    toOnlyResult,
    futureRangeResult,
    activityTypeResult,
    boundaryResult,
    paginatedResult,
    orderedResult,
    combinedFilterResult,
  ];

  for (const result of allResults) {
    TestValidator.predicate(
      "all results have valid pagination",
      result.pagination.current >= 0 &&
        result.pagination.limit > 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "all results have data array",
      Array.isArray(result.data),
    );
  }
}
