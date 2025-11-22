import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_user_activities_no_matching_activities(
  connection: api.IConnection,
) {
  // Generate a test user ID that likely has no activities
  const testUserId = typia.random<string & tags.Format<"uuid">>();

  // Test Case 1: Non-existent activity type filter
  const emptyByActivityType =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "nonexistent_activity",
        page: 1,
        limit: 20,
        order_by: "created_at",
        order_direction: "desc",
      },
    });
  typia.assert(emptyByActivityType);

  // Validate empty results structure
  TestValidator.equals(
    "empty results should have zero records",
    emptyByActivityType.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results should have zero pages",
    emptyByActivityType.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results should have zero items per page",
    emptyByActivityType.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty data array length",
    emptyByActivityType.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be 0 for empty results",
    emptyByActivityType.pagination.current,
    0,
  );

  // Test Case 2: Date range filter with no activities
  const emptyByDateRange =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        date_from: "2030-01-01T00:00:00.000Z", // Future date - no activities
        date_to: "2030-12-31T23:59:59.999Z",
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      },
    });
  typia.assert(emptyByDateRange);

  TestValidator.equals(
    "future date filter should return empty",
    emptyByDateRange.data.length,
    0,
  );
  TestValidator.equals(
    "future date pagination should be empty",
    emptyByDateRange.pagination.records,
    0,
  );

  // Test Case 3: Community ID filter with no participation
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  const emptyByCommunity =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        community_id: testCommunityId,
        page: 1,
        limit: 25,
        order_by: "activity_type",
        order_direction: "asc",
      },
    });
  typia.assert(emptyByCommunity);

  TestValidator.equals(
    "non-participated community should return empty",
    emptyByCommunity.data.length,
    0,
  );
  TestValidator.equals(
    "community filter pagination should be zero",
    emptyByCommunity.pagination.records,
    0,
  );

  // Test Case 4: Target ID filter for non-existent content
  const testTargetId = typia.random<string & tags.Format<"uuid">>();
  const emptyByTarget =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        target_id: testTargetId,
        page: 1,
        limit: 50,
        order_by: "created_at",
        order_direction: "desc",
      },
    });
  typia.assert(emptyByTarget);

  TestValidator.equals(
    "non-existent target should return empty",
    emptyByTarget.data.length,
    0,
  );
  TestValidator.equals(
    "target filter pagination should be zero",
    emptyByTarget.pagination.records,
    0,
  );

  // Test Case 5: Combined filters with no matches
  const emptyCombined =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "post_created,comment_voted",
        community_id: typia.random<string & tags.Format<"uuid">>(),
        date_from: "2020-01-01T00:00:00.000Z",
        date_to: "2020-02-01T00:00:00.000Z", // Past date range
        page: 1,
        limit: 15,
        order_by: "activity_type",
        order_direction: "desc",
      },
    });
  typia.assert(emptyCombined);

  TestValidator.equals(
    "combined empty filters should return empty",
    emptyCombined.data.length,
    0,
  );
  TestValidator.equals(
    "combined filter pagination should be zero",
    emptyCombined.pagination.records,
    0,
  );

  // Test Case 6: Pagination test with empty results (page 2)
  const emptySecondPage =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        page: 2, // Request second page of empty results
        limit: 20,
        order_by: "created_at",
        order_direction: "desc",
      },
    });
  typia.assert(emptySecondPage);

  TestValidator.equals(
    "second page of empty results should be empty",
    emptySecondPage.data.length,
    0,
  );
  TestValidator.equals(
    "second page pagination should remain zero",
    emptySecondPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page should reflect requested page",
    emptySecondPage.pagination.current,
    2,
  );

  // Test Case 7: Different ordering with empty results
  const emptyByActivityTypeOrder =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "session_started",
        order_by: "activity_type",
        order_direction: "asc",
        page: 1,
        limit: 30,
      },
    });
  typia.assert(emptyByActivityTypeOrder);

  TestValidator.equals(
    "activity type ordered empty results",
    emptyByActivityTypeOrder.data.length,
    0,
  );
  TestValidator.equals(
    "activity type ordered pagination",
    emptyByActivityTypeOrder.pagination.records,
    0,
  );

  // Test Case 8: Maximum limit with empty results
  const emptyMaxLimit =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 100, // Maximum limit
        order_by: "created_at",
        order_direction: "desc",
      },
    });
  typia.assert(emptyMaxLimit);

  TestValidator.equals(
    "maximum limit with empty results",
    emptyMaxLimit.data.length,
    0,
  );
  TestValidator.equals(
    "max limit pagination should be zero",
    emptyMaxLimit.pagination.records,
    0,
  );
  TestValidator.equals(
    "limit should be respected",
    emptyMaxLimit.pagination.limit,
    100,
  );
}
