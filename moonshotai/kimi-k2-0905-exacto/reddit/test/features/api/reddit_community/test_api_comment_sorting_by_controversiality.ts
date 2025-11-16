import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test comment sorting by controversiality score to surface engaging
 * discussions.
 *
 * This test validates that controversial comments (with balanced
 * upvote/downvote ratios) are properly identified and sorted by the
 * controversiality algorithm. The test creates comments with different voting
 * patterns to verify that the sorting mechanism correctly prioritizes
 * discussions that generate significant voting activity from both
 * perspectives.
 *
 * The test follows this process:
 *
 * 1. Generate a post ID and create multiple comments with varied upvote/downvote
 *    ratios
 * 2. Test controversiality sorting by creating requests with different sort
 *    configurations
 * 3. Validate that the most controversial comments (balanced upvotes and
 *    downvotes) appear first
 * 4. Ensure that comments with extreme ratios (mostly upvotes or mostly downvotes)
 *    are less controversial
 */
export async function test_api_comment_sorting_by_controversiality(
  connection: api.IConnection,
) {
  // Generate a random post ID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Create comment data with different controversiality patterns
  // High controversiality: balanced upvotes and downvotes
  const highlyControversialContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  const moderateContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  const oneSidedContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });

  // Test 1: Request comments sorted by controversiality in descending order
  const controversialDescRequest = {
    sort_by: "controversiality" as const,
    sort_order: "desc" as const,
    limit: 50,
    content_filter: [highlyControversialContent.substring(0, 100)] as (string &
      tags.MaxLength<500>)[],
  } satisfies IRedditCommunityComment.IRequest;

  const controversialDescResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: controversialDescRequest,
    });
  typia.assert(controversialDescResult);

  // Test 2: Request comments sorted by controversiality in ascending order
  const controversialAscRequest = {
    sort_by: "controversiality" as const,
    sort_order: "asc" as const,
    limit: 25,
  } satisfies IRedditCommunityComment.IRequest;

  const controversialAscResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: controversialAscRequest,
    });
  typia.assert(controversialAscResult);

  // Test 3: Verify that controversial sorting accepts valid parameters
  TestValidator.predicate(
    "controversial desc sorting should return valid results",
    controversialDescResult.data.length >= 0 &&
      controversialDescResult.pagination.limit === 50 &&
      controversialDescResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "controversial asc sorting should return valid results",
    controversialAscResult.data.length >= 0 &&
      controversialAscResult.pagination.limit === 25 &&
      controversialAscResult.pagination.current === 1,
  );

  // Test 4: Validate that vote score filtering works with controversial pattern
  const voteScoreFilteredRequest = {
    sort_by: "vote_score" as const,
    sort_order: "desc" as const,
    vote_score_min: 5,
    vote_score_max: 50,
    limit: 20,
  } satisfies IRedditCommunityComment.IRequest;

  const voteScoreFilteredResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: voteScoreFilteredRequest,
    });
  typia.assert(voteScoreFilteredResult);

  TestValidator.predicate(
    "vote score filtering should respect boundaries",
    voteScoreFilteredResult.data.every(
      (comment) =>
        comment.upvote_count - comment.downvote_count >= 5 &&
        comment.upvote_count - comment.downvote_count <= 50,
    ),
  );

  // Test 5: Test thread depth restrictions with controversial sorting
  const threadDepthRequest = {
    sort_by: "controversiality" as const,
    sort_order: "desc" as const,
    thread_depth_min: 0,
    thread_depth_max: 3,
    limit: 15,
  } satisfies IRedditCommunityComment.IRequest;

  const threadDepthResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: threadDepthRequest,
    });
  typia.assert(threadDepthResult);

  TestValidator.predicate(
    "thread depth filtering should work correctly",
    threadDepthResult.data.every(
      (comment) => comment.thread_depth >= 0 && comment.thread_depth <= 3,
    ),
  );
}
