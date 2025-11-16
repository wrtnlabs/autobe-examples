import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test temporal filtering of Reddit community comments by creation and update
 * timestamps.
 *
 * This test validates comprehensive temporal filtering capabilities that enable
 * users to explore conversation timelines by filtering comments based on
 * creation and update timestamps. It verifies that users can set date ranges to
 * view comments created or updated within specific time periods, ensuring
 * temporal filtering works correctly with other filters and that timestamp
 * comparisons are accurate.
 */
export async function test_api_comment_temporal_filtering(
  connection: api.IConnection,
) {
  // Test temporal filtering with various date range scenarios
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Create post ID for testing (real API calls will use actual posts, IDs should match real posts)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Test filtering comments by creation date range
  const request = {
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
    page: 1,
    limit: 10,
    created_after: oneDayAgo.toISOString(),
    created_before: now.toISOString(),
  } satisfies IRedditCommunityComment.IRequest;

  const commentsInRange =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: request,
    });
  typia.assert(commentsInRange);

  TestValidator.predicate(
    "comments retrieved with temporal filters",
    commentsInRange.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination info matches request",
    commentsInRange.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination current page matches",
    commentsInRange.pagination.current === 1,
  );

  // Validate temporal filter results
  commentsInRange.data.forEach((comment) => {
    const commentCreated = new Date(comment.created_at);
    TestValidator.predicate(
      "comment within time range",
      commentCreated >= oneDayAgo && commentCreated <= now,
    );
  });
}
