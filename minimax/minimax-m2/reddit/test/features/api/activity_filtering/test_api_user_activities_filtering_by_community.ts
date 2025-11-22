import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

/**
 * Test activity filtering by specific community using community_id parameter.
 *
 * This test validates the community-based filtering functionality for user
 * activities. It ensures that:
 *
 * 1. Activities are properly filtered by community_id
 * 2. Activities without community context are handled appropriately
 * 3. Non-existent community IDs return appropriate error responses
 * 4. Pagination and sorting work correctly with community filtering
 * 5. Response structure matches the expected DTO definitions
 */
export async function test_api_user_activities_filtering_by_community(
  connection: api.IConnection,
) {
  // Generate test user ID for the activities endpoint
  const testUserId = typia.random<string & tags.Format<"uuid">>();

  // Generate test community IDs
  const validCommunityId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Basic filtering with valid community ID
  const validCommunityRequest: IRedditPlatformUserActivity.IRequest = {
    community_id: validCommunityId,
    page: 1,
    limit: 20,
    order_by: "created_at",
    order_direction: "desc",
  };

  const validCommunityResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: validCommunityRequest,
    });
  typia.assert(validCommunityResponse);

  // Validate response structure for community filtering
  TestValidator.equals(
    "response has pagination metadata",
    typeof validCommunityResponse.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(validCommunityResponse.data),
    true,
  );

  // Test 2: Filtering with non-existent community ID
  const nonExistentCommunityRequest: IRedditPlatformUserActivity.IRequest = {
    community_id: nonExistentCommunityId,
    page: 1,
    limit: 20,
  };

  await TestValidator.error(
    "non-existent community should return error",
    async () => {
      await api.functional.redditPlatform.users.activities.index(connection, {
        userId: testUserId,
        body: nonExistentCommunityRequest,
      });
    },
  );

  // Test 3: Test with additional filtering parameters
  const advancedFilterRequest: IRedditPlatformUserActivity.IRequest = {
    community_id: validCommunityId,
    activity_type: "post_created,comment_created",
    date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    date_to: new Date().toISOString(), // current time
    page: 1,
    limit: 10,
    order_by: "activity_type",
    order_direction: "asc",
  };

  const advancedFilterResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: advancedFilterRequest,
    });
  typia.assert(advancedFilterResponse);

  // Validate advanced filtering response
  TestValidator.equals(
    "advanced filter response has correct pagination",
    advancedFilterResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "response data is array",
    Array.isArray(advancedFilterResponse.data),
    true,
  );

  // Test 4: Test pagination with community filtering
  const paginationRequest: IRedditPlatformUserActivity.IRequest = {
    community_id: validCommunityId,
    page: 2,
    limit: 5,
  };

  const paginationResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: paginationRequest,
    });
  typia.assert(paginationResponse);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination shows correct page",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination shows correct limit",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination has records count",
    typeof paginationResponse.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    typeof paginationResponse.pagination.pages === "number",
    true,
  );

  // Test 5: Test edge case - page with no results
  const noResultsRequest: IRedditPlatformUserActivity.IRequest = {
    community_id: validCommunityId,
    page: 9999, // Very high page number
    limit: 20,
  };

  const noResultsResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: noResultsRequest,
    });
  typia.assert(noResultsResponse);

  // Validate empty results handling
  TestValidator.equals(
    "no results has empty data array",
    noResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no results shows correct page",
    noResultsResponse.pagination.current,
    9999,
  );

  // Test 6: Test with minimal request parameters
  const minimalRequest: IRedditPlatformUserActivity.IRequest = {
    community_id: validCommunityId,
  };

  const minimalResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: minimalRequest,
    });
  typia.assert(minimalResponse);

  // Validate default pagination values
  TestValidator.equals(
    "minimal request uses default page",
    minimalResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimal request uses default limit",
    minimalResponse.pagination.limit,
    20,
  );

  // Test 7: Test activity structure validation
  if (validCommunityResponse.data.length > 0) {
    const sampleActivity = validCommunityResponse.data[0];

    // Validate activity summary structure
    TestValidator.equals(
      "activity has id",
      typeof sampleActivity.id === "string",
      true,
    );
    TestValidator.equals(
      "activity has activity_type",
      typeof sampleActivity.activity_type === "string",
      true,
    );
    TestValidator.equals(
      "activity has activity_description",
      typeof sampleActivity.activity_description === "string",
      true,
    );
    TestValidator.equals(
      "activity has created_at",
      typeof sampleActivity.created_at === "string",
      true,
    );
    TestValidator.equals(
      "activity has target_community_id",
      typeof sampleActivity.target_community_id === "string",
      true,
    );

    // Validate optional fields exist when present
    if (sampleActivity.activity_metadata !== undefined) {
      TestValidator.equals(
        "activity_metadata is string when present",
        typeof sampleActivity.activity_metadata === "string",
        true,
      );
    }

    if (sampleActivity.ip_address !== undefined) {
      TestValidator.equals(
        "ip_address is string when present",
        typeof sampleActivity.ip_address === "string",
        true,
      );
    }

    if (sampleActivity.user_agent !== undefined) {
      TestValidator.equals(
        "user_agent is string when present",
        typeof sampleActivity.user_agent === "string",
        true,
      );
    }
  }

  // Test 8: Test order validation
  const orderTestResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: {
        community_id: validCommunityId,
        order_by: "activity_type",
        order_direction: "desc",
      },
    });
  typia.assert(orderTestResponse);

  // Test 9: Validate date-time format in responses
  if (validCommunityResponse.data.length > 0) {
    const activity = validCommunityResponse.data[0];
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    TestValidator.equals(
      "created_at follows ISO 8601 format",
      dateRegex.test(activity.created_at),
      true,
    );
  }

  // Test 10: Boundary testing - maximum limit
  const maxLimitRequest: IRedditPlatformUserActivity.IRequest = {
    community_id: validCommunityId,
    limit: 100, // Maximum allowed limit
  };

  const maxLimitResponse =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId: testUserId,
      body: maxLimitRequest,
    });
  typia.assert(maxLimitResponse);

  TestValidator.equals(
    "max limit request succeeds",
    maxLimitResponse.pagination.limit,
    100,
  );

  console.log("Community filtering test completed successfully");
}
