import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test sorting member activity metrics by total karma score in descending
 * order.
 *
 * This test validates that the member activity API correctly returns aggregate
 * member statistics sorted by total karma (upvotes minus downvotes) when the
 * sort_by parameter is set to 'most_upvoted'. The test ensures that member
 * statistics with higher total karma scores appear first in the response.
 *
 * Note: The API returns aggregate member statistics (total_posts,
 * total_comments, post_karma, comment_karma, total_karma), not individual
 * posts/comments.
 *
 * Test workflow:
 *
 * 1. Generate a test username for activity retrieval
 * 2. Request member activity metrics with sort_by='most_upvoted' parameter
 * 3. Validate the response structure and pagination metadata
 * 4. Verify that member statistics are sorted by total_karma in descending order
 * 5. Ensure entries with highest total karma appear first
 * 6. Validate karma calculation integrity (total_karma = post_karma +
 *    comment_karma)
 */
export async function test_api_member_activity_sorting_most_upvoted(
  connection: api.IConnection,
) {
  // Generate a test username for the activity query
  const testUsername = RandomGenerator.name(1);

  // Request member activity metrics sorted by most upvoted (highest total karma)
  const activityResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        sort_by: "most_upvoted",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });

  // Validate response structure
  typia.assert(activityResponse);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid current page",
    activityResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have positive limit",
    activityResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative records count",
    activityResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative pages count",
    activityResponse.pagination.pages >= 0,
  );

  // Validate that data is an array
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(activityResponse.data),
  );

  // If there are multiple member statistics entries, verify sorting order by total_karma
  if (activityResponse.data.length > 1) {
    // Extract total_karma scores
    const karmaScores = activityResponse.data.map((item) => item.total_karma);

    // Verify descending order: each item should have total_karma >= next item
    for (let i = 0; i < karmaScores.length - 1; i++) {
      TestValidator.predicate(
        `member stats at index ${i} (karma: ${karmaScores[i]}) should have karma >= stats at index ${i + 1} (karma: ${karmaScores[i + 1]})`,
        karmaScores[i] >= karmaScores[i + 1],
      );
    }

    // Verify the first item has the highest or equal total_karma
    const maxKarma = Math.max(...karmaScores);
    TestValidator.equals(
      "first member stats should have the highest total karma score",
      activityResponse.data[0].total_karma,
      maxKarma,
    );
  }

  // Validate each member statistics entry has proper structure and karma integrity
  activityResponse.data.forEach((memberStats, index) => {
    // Validate total_posts is non-negative
    TestValidator.predicate(
      `member stats ${index} should have non-negative total_posts`,
      memberStats.total_posts >= 0,
    );

    // Validate total_comments is non-negative
    TestValidator.predicate(
      `member stats ${index} should have non-negative total_comments`,
      memberStats.total_comments >= 0,
    );

    // Verify karma calculation integrity: total_karma = post_karma + comment_karma
    TestValidator.equals(
      `member stats ${index} total_karma should equal sum of post_karma and comment_karma`,
      memberStats.total_karma,
      memberStats.post_karma + memberStats.comment_karma,
    );
  });
}
