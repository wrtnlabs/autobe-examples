import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering member activity with content_type="posts" parameter.
 *
 * This test validates that the member activity retrieval API correctly accepts
 * and processes the content_type filter parameter set to "posts". Since the API
 * returns aggregate statistics (total posts/comments and karma scores) rather
 * than individual post items, this test focuses on validating:
 *
 * 1. The API successfully processes the content_type="posts" filter
 * 2. Response structure matches the expected IPageIRedditCommunityGuest type
 * 3. Pagination metadata is correctly populated and valid
 * 4. Aggregate statistics (total_posts, total_comments, karma values) are present
 * 5. Karma calculations are consistent (total_karma = post_karma + comment_karma)
 *
 * Note: This is an integration test that validates API response structure and
 * data integrity rather than testing actual post filtering behavior, as the
 * response contains aggregate statistics rather than individual content items.
 */
export async function test_api_member_activity_posts_only_filter(
  connection: api.IConnection,
) {
  // Generate a test username to query activity for
  const testUsername = `user_${RandomGenerator.alphaNumeric(8)}`;

  // Call the activity API with content_type filter set to "posts"
  const activityResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        content_type: "posts",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });

  // Validate the complete response structure
  typia.assert(activityResponse);

  // Verify pagination metadata is present and valid
  TestValidator.predicate(
    "pagination current page should be non-negative",
    activityResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    activityResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    activityResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    activityResponse.pagination.pages >= 0,
  );

  // Verify the page limit matches what we requested
  TestValidator.equals(
    "pagination limit should match request",
    activityResponse.pagination.limit,
    20,
  );

  // Verify data array is present
  TestValidator.predicate(
    "activity data array should be defined",
    Array.isArray(activityResponse.data),
  );

  // Validate each activity aggregate in the response
  for (const activity of activityResponse.data) {
    // Verify all count fields are non-negative integers
    TestValidator.predicate(
      "total_posts should be non-negative",
      activity.total_posts >= 0,
    );

    TestValidator.predicate(
      "total_comments should be non-negative",
      activity.total_comments >= 0,
    );

    // Verify karma fields are valid integers (can be negative)
    TestValidator.predicate(
      "post_karma should be a valid integer",
      Number.isInteger(activity.post_karma),
    );

    TestValidator.predicate(
      "comment_karma should be a valid integer",
      Number.isInteger(activity.comment_karma),
    );

    TestValidator.predicate(
      "total_karma should be a valid integer",
      Number.isInteger(activity.total_karma),
    );

    // Verify karma calculation integrity
    TestValidator.equals(
      "total_karma should equal sum of post_karma and comment_karma",
      activity.total_karma,
      activity.post_karma + activity.comment_karma,
    );
  }
}
