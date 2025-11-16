import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering member activity to show only comments.
 *
 * This test validates the `content_type='comments'` filter functionality of the
 * member activity API. The API returns paginated aggregate activity metrics for
 * a community member. When the comments filter is applied, the response should
 * reflect comment-focused activity data.
 *
 * The test verifies:
 *
 * 1. The API accepts and processes the content_type='comments' filter parameter
 * 2. Response structure matches the expected pagination format
 * 3. Activity metrics (total_comments, comment_karma) are properly returned
 * 4. Pagination metadata is valid and consistent
 * 5. The filter parameter can be combined with other query parameters (page,
 *    limit)
 *
 * Test workflow:
 *
 * 1. Generate a test member username
 * 2. Retrieve activity with content_type='comments' filter
 * 3. Validate response structure and pagination
 * 4. Verify activity metrics are present and valid
 * 5. Test pagination with different limit values
 */
export async function test_api_member_activity_comments_only_filter(
  connection: api.IConnection,
) {
  // Generate unique test member username
  const testUsername = `test_user_${RandomGenerator.alphaNumeric(8)}`;

  // Retrieve member activity with comments-only filter
  const commentsOnlyResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 20,
        content_type: "comments",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });

  // Validate complete response structure
  typia.assert(commentsOnlyResponse);

  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination metadata should exist",
    commentsOnlyResponse.pagination !== null &&
      commentsOnlyResponse.pagination !== undefined,
  );

  // Validate pagination current page
  TestValidator.equals(
    "pagination current page should be 0 (first page)",
    commentsOnlyResponse.pagination.current,
    0,
  );

  // Validate pagination limit matches request
  TestValidator.equals(
    "pagination limit should match requested limit",
    commentsOnlyResponse.pagination.limit,
    20,
  );

  // Validate data array exists
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(commentsOnlyResponse.data),
  );

  // Test with different pagination parameters to verify filter works with pagination
  const paginatedResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        content_type: "comments",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });

  typia.assert(paginatedResponse);

  // Verify pagination limit is applied correctly
  TestValidator.equals(
    "paginated response limit should be 10",
    paginatedResponse.pagination.limit,
    10,
  );

  // Test combining content_type filter with search parameter
  const searchResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        content_type: "comments",
        search: RandomGenerator.paragraph({ sentences: 2 }),
        page: 1,
        limit: 15,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });

  typia.assert(searchResponse);

  // Test combining content_type filter with sorting
  const sortedResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        content_type: "comments",
        sort_by: "newest",
        limit: 25,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });

  typia.assert(sortedResponse);

  TestValidator.equals(
    "sorted response should respect limit parameter",
    sortedResponse.pagination.limit,
    25,
  );
}
