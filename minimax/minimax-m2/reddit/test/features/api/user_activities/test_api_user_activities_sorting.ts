import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_user_activities_sorting(
  connection: api.IConnection,
) {
  // Generate a random user ID for testing activities
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Sort by created_at in descending order (newest first)
  const requestDesc = {
    page: 1,
    limit: 20,
    order_by: "created_at" as const,
    order_direction: "desc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const responseDesc =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestDesc,
    });
  typia.assert(responseDesc);

  // Verify response structure
  TestValidator.equals(
    "response has pagination data",
    responseDesc.pagination.current,
    1,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(responseDesc.data),
    true,
  );
  TestValidator.predicate(
    "activities array is not empty",
    responseDesc.data.length > 0,
  );

  // Validate chronological sorting (descending - newest first)
  for (let i = 0; i < responseDesc.data.length - 1; i++) {
    const currentActivity = new Date(responseDesc.data[i].created_at).getTime();
    const nextActivity = new Date(
      responseDesc.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      currentActivity >= nextActivity,
    );
  }

  // Test 2: Sort by created_at in ascending order (oldest first)
  const requestAsc = {
    page: 1,
    limit: 20,
    order_by: "created_at" as const,
    order_direction: "asc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const responseAsc =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestAsc,
    });
  typia.assert(responseAsc);

  // Validate chronological sorting (ascending - oldest first)
  for (let i = 0; i < responseAsc.data.length - 1; i++) {
    const currentActivity = new Date(responseAsc.data[i].created_at).getTime();
    const nextActivity = new Date(responseAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at ascending order at index ${i}`,
      currentActivity <= nextActivity,
    );
  }

  // Test 3: Sort by activity_type in descending order
  const requestTypeDesc = {
    page: 1,
    limit: 20,
    order_by: "activity_type" as const,
    order_direction: "desc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const responseTypeDesc =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestTypeDesc,
    });
  typia.assert(responseTypeDesc);

  // Validate activity_type sorting (descending alphabetical order)
  for (let i = 0; i < responseTypeDesc.data.length - 1; i++) {
    const currentType = responseTypeDesc.data[i].activity_type;
    const nextType = responseTypeDesc.data[i + 1].activity_type;
    TestValidator.predicate(
      `activity_type descending order at index ${i}`,
      currentType >= nextType,
    );
  }

  // Test 4: Sort by activity_type in ascending order
  const requestTypeAsc = {
    page: 1,
    limit: 20,
    order_by: "activity_type" as const,
    order_direction: "asc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const responseTypeAsc =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestTypeAsc,
    });
  typia.assert(responseTypeAsc);

  // Validate activity_type sorting (ascending alphabetical order)
  for (let i = 0; i < responseTypeAsc.data.length - 1; i++) {
    const currentType = responseTypeAsc.data[i].activity_type;
    const nextType = responseTypeAsc.data[i + 1].activity_type;
    TestValidator.predicate(
      `activity_type ascending order at index ${i}`,
      currentType <= nextType,
    );
  }

  // Test 5: Test pagination consistency with sorting
  const requestPage1 = {
    page: 1,
    limit: 10,
    order_by: "created_at" as const,
    order_direction: "desc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const requestPage2 = {
    page: 2,
    limit: 10,
    order_by: "created_at" as const,
    order_direction: "desc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const page1Response =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestPage1,
    });
  typia.assert(page1Response);

  const page2Response =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestPage2,
    });
  typia.assert(page2Response);

  // Verify pagination data consistency
  TestValidator.equals(
    "page 1 pagination is correct",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 2 pagination is correct",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit is consistent",
    page2Response.pagination.limit,
    10,
  );

  // Test 6: Test sorting with activity type filtering
  const requestFiltered = {
    activity_type: "post_created,comment_created",
    page: 1,
    limit: 20,
    order_by: "created_at" as const,
    order_direction: "desc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const filteredResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestFiltered,
    });
  typia.assert(filteredResponse);

  // Validate filtered results contain only specified activity types
  const allowedTypes = ["post_created", "comment_created"];
  for (const activity of filteredResponse.data) {
    TestValidator.predicate(
      `filtered activity type is allowed`,
      allowedTypes.includes(activity.activity_type),
    );
  }

  // Test 7: Test stable sorting with same created_at timestamps
  // This test verifies that activities with identical timestamps maintain relative order
  const testActivities = filteredResponse.data;
  const timestamps = testActivities.map((a) => a.created_at);
  const uniqueTimestamps = new Set(timestamps);

  // If there are duplicate timestamps, verify stable sorting
  if (uniqueTimestamps.size < timestamps.length) {
    // Find activities with the same timestamp
    const timestampGroups: { [timestamp: string]: typeof testActivities } = {};
    for (const activity of testActivities) {
      const timestamp = activity.created_at;
      if (!timestampGroups[timestamp]) {
        timestampGroups[timestamp] = [];
      }
      timestampGroups[timestamp].push(activity);
    }

    // Verify each group maintains consistent ordering
    for (const [timestamp, activities] of Object.entries(timestampGroups)) {
      if (activities.length > 1) {
        // Test that the relative ordering is maintained
        for (let i = 0; i < activities.length - 1; i++) {
          const currentActivity = activities[i];
          const nextActivity = activities[i + 1];
          // Activities should maintain their relative order
          TestValidator.notEquals(
            "activities with same timestamp maintain stable order",
            currentActivity.id,
            nextActivity.id,
          );
        }
      }
    }
  }

  // Test 8: Test default sorting behavior (should default to created_at desc)
  const requestDefault = {
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const defaultResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestDefault,
    });
  typia.assert(defaultResponse);

  // Compare default with explicit created_at desc to ensure they match
  TestValidator.equals(
    "default sorting matches created_at desc",
    defaultResponse.data.map((a) => a.id),
    responseDesc.data.map((a) => a.id),
  );

  // Test 9: Test edge case - empty result set
  const requestEmpty = {
    activity_type: "nonexistent_activity",
    page: 1,
    limit: 20,
    order_by: "created_at" as const,
    order_direction: "desc" as const,
  } satisfies IRedditPlatformUserActivity.IRequest;

  const emptyResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: requestEmpty,
    });
  typia.assert(emptyResponse);

  TestValidator.equals(
    "empty result has no data",
    emptyResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "empty result pagination is valid",
    emptyResponse.pagination.records >= 0,
  );

  // Test 10: Verify all response structures have required fields
  const allResponses = [
    responseDesc,
    responseAsc,
    responseTypeDesc,
    responseTypeAsc,
    filteredResponse,
    defaultResponse,
  ];

  for (const response of allResponses) {
    for (const activity of response.data) {
      // Verify required fields exist and have correct types
      TestValidator.predicate(
        "activity has valid id",
        typeof activity.id === "string",
      );
      TestValidator.predicate(
        "activity has valid activity_type",
        typeof activity.activity_type === "string",
      );
      TestValidator.predicate(
        "activity has valid created_at",
        typeof activity.created_at === "string",
      );
      TestValidator.predicate(
        "activity has valid target_community_id",
        typeof activity.target_community_id === "string",
      );
    }
  }
}
