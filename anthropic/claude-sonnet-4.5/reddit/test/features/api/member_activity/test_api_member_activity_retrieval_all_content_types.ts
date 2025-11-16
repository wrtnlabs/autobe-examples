import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieving a member's complete activity history with both posts and
 * comments.
 *
 * This test validates the activity retrieval endpoint when content_type is set
 * to 'all', ensuring that the API returns member activity aggregate metrics.
 * The test verifies:
 *
 * 1. API accepts the 'all' content_type filter for unified activity feed
 * 2. Response structure matches IPageIRedditCommunityGuest schema
 * 3. Pagination metadata is properly populated with valid values
 * 4. Response data array contains IRedditCommunityGuest aggregate activity metrics
 * 5. Activity metrics (posts, comments, karma) are properly structured integers
 * 6. Total karma correctly sums post karma and comment karma
 * 7. All fields pass strict type validation via typia.assert
 *
 * Since we don't have member creation or content posting APIs in the provided
 * materials, this test focuses on validating the retrieval mechanism and
 * response structure with a test username. The response contains aggregate
 * member statistics rather than individual activity items.
 */
export async function test_api_member_activity_retrieval_all_content_types(
  connection: api.IConnection,
) {
  // Generate a test username for the member
  const testUsername = RandomGenerator.name(2)
    .toLowerCase()
    .replace(/\s+/g, "_");

  // Create request body with content_type set to 'all' to retrieve both posts and comments
  const requestBody = {
    page: 1,
    limit: 20,
    content_type: "all" as const,
  } satisfies IRedditCommunityGuest.IActivityRequest;

  // Retrieve the member's activity history with content_type='all'
  const activityResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: requestBody,
    });

  // Validate the complete response structure with typia
  typia.assert(activityResponse);

  // Validate pagination metadata structure exists
  TestValidator.predicate(
    "pagination object exists",
    activityResponse.pagination !== null &&
      activityResponse.pagination !== undefined,
  );

  // Validate pagination current page is non-negative
  TestValidator.predicate(
    "current page is non-negative",
    activityResponse.pagination.current >= 0,
  );

  // Validate pagination limit is positive
  TestValidator.predicate(
    "limit is positive",
    activityResponse.pagination.limit > 0,
  );

  // Validate pagination records count is non-negative
  TestValidator.predicate(
    "records count is non-negative",
    activityResponse.pagination.records >= 0,
  );

  // Validate pagination pages count is non-negative
  TestValidator.predicate(
    "pages count is non-negative",
    activityResponse.pagination.pages >= 0,
  );

  // Validate data array exists and is an array
  TestValidator.predicate(
    "data array exists and is array",
    Array.isArray(activityResponse.data),
  );

  // Validate that data array length respects the limit
  TestValidator.predicate(
    "data array length respects limit",
    activityResponse.data.length <= requestBody.limit,
  );

  // If there's activity data, validate the structure of aggregate metrics
  if (activityResponse.data.length > 0) {
    const memberMetrics = activityResponse.data[0];
    typia.assert(memberMetrics);

    // Validate total_posts is a non-negative integer
    TestValidator.predicate(
      "total_posts is non-negative integer",
      Number.isInteger(memberMetrics.total_posts) &&
        memberMetrics.total_posts >= 0,
    );

    // Validate total_comments is a non-negative integer
    TestValidator.predicate(
      "total_comments is non-negative integer",
      Number.isInteger(memberMetrics.total_comments) &&
        memberMetrics.total_comments >= 0,
    );

    // Validate post_karma is an integer (can be negative)
    TestValidator.predicate(
      "post_karma is an integer",
      Number.isInteger(memberMetrics.post_karma),
    );

    // Validate comment_karma is an integer (can be negative)
    TestValidator.predicate(
      "comment_karma is an integer",
      Number.isInteger(memberMetrics.comment_karma),
    );

    // Validate total_karma is an integer
    TestValidator.predicate(
      "total_karma is an integer",
      Number.isInteger(memberMetrics.total_karma),
    );

    // Validate total_karma equals post_karma + comment_karma
    TestValidator.equals(
      "total_karma equals sum of post and comment karma",
      memberMetrics.total_karma,
      memberMetrics.post_karma + memberMetrics.comment_karma,
    );
  }

  // Validate pagination consistency: if records > 0, pages should be > 0
  if (activityResponse.pagination.records > 0) {
    TestValidator.predicate(
      "pages is positive when records exist",
      activityResponse.pagination.pages > 0,
    );
  }

  // Validate pagination math: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    activityResponse.pagination.records / activityResponse.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation matches ceil of records divided by limit",
    activityResponse.pagination.pages,
    expectedPages,
  );
}
