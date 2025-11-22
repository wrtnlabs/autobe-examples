import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_user_activities_filtering_by_activity_type(
  connection: api.IConnection,
) {
  // Generate test user data
  const testUserId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Filter by single activity type
  const singleTypeResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "post_created",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(singleTypeResult);

  // Verify response structure
  TestValidator.equals(
    "response has pagination data",
    singleTypeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "response has limit applied",
    singleTypeResult.pagination.limit,
    10,
  );

  // Test 2: Filter by multiple activity types (comma-separated)
  const multipleTypesResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "post_created,comment_created",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(multipleTypesResult);

  // Verify all returned activities match the filtered types
  for (const activity of multipleTypesResult.data) {
    TestValidator.predicate(
      `activity type matches filter: ${activity.activity_type}`,
      activity.activity_type === "post_created" ||
        activity.activity_type === "comment_created",
    );
  }

  // Test 3: Filter by non-existent activity type
  const nonExistentTypeResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "non_existent_activity",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(nonExistentTypeResult);

  // Should return empty results for non-existent activity type
  TestValidator.equals(
    "no activities for non-existent type",
    nonExistentTypeResult.data.length,
    0,
  );

  // Test 4: Filter with additional parameters (community_id)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const combinedFilterResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "community_subscribed",
        community_id: communityId,
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Verify pagination works with filtering
  TestValidator.predicate(
    "pagination maintains consistency",
    combinedFilterResult.pagination.pages >= 0,
  );

  // Test 5: Filter with date range
  const dateFrom = RandomGenerator.date(new Date(), 86400000 * 7).toISOString();
  const dateTo = new Date().toISOString();
  const dateRangeResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "session_started",
        date_from: dateFrom,
        date_to: dateTo,
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(dateRangeResult);

  // Verify response data structure
  for (const activity of dateRangeResult.data) {
    TestValidator.predicate(
      "all activities match session_started type",
      activity.activity_type === "session_started",
    );
    TestValidator.equals(
      "activity has required fields",
      {
        id: activity.id,
        activityType: activity.activity_type,
        description: activity.activity_description,
        createdAt: activity.created_at,
        communityId: activity.target_community_id,
      },
      {
        id: activity.id,
        activityType: activity.activity_type,
        description: activity.activity_description,
        createdAt: activity.created_at,
        communityId: activity.target_community_id,
      },
    );
  }

  // Test 6: Empty activity_type parameter (should return all activities)
  const noFilterResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        page: 1,
        limit: 15,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(noFilterResult);

  // Should return activities when no activity_type specified
  TestValidator.predicate(
    "returns activities when no filter",
    noFilterResult.data.length <= 15,
  );

  // Test 7: Test edge case - very long activity_type string
  const activityTypes = [
    "post_created",
    "comment_created",
    "post_voted",
    "comment_voted",
    "community_subscribed",
    "community_unsubscribed",
    "profile_viewed",
    "content_shared",
    "session_started",
    "session_ended",
  ];
  const longActivityTypes = activityTypes.join(",") + ",extra_type";
  const edgeCaseResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: longActivityTypes,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(edgeCaseResult);

  // Verify that only valid activity types are processed
  const validTypesInFilter = [
    "post_created",
    "comment_created",
    "post_voted",
    "comment_voted",
    "community_subscribed",
    "community_unsubscribed",
    "profile_viewed",
    "content_shared",
    "session_started",
    "session_ended",
  ];
  for (const activity of edgeCaseResult.data) {
    TestValidator.predicate(
      `activity type is valid: ${activity.activity_type}`,
      validTypesInFilter.includes(activity.activity_type),
    );
  }

  // Test 8: Test sorting with activity_type filtering
  const sortedResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        activity_type: "post_voted",
        order_by: "activity_type",
        order_direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(sortedResult);

  // Verify sorting works correctly
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      TestValidator.predicate(
        "activities sorted by type",
        sortedResult.data[i - 1].activity_type <=
          sortedResult.data[i].activity_type,
      );
    }
  }
}
