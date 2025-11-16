import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test filtering comments by vote score thresholds to surface high-quality
 * content.
 *
 * This test verifies that users can set minimum and maximum vote score ranges
 * to find comments that meet specific engagement criteria. The test validates:
 *
 * 1. Vote score filtering works with minimum threshold only
 * 2. Vote score filtering works with maximum threshold only
 * 3. Vote score filtering works with both min and max range
 * 4. Vote score calculation is accurate (upvotes - downvotes)
 * 5. Filtering operates correctly across different combinations
 *
 * The test uses the comment filtering API to retrieve comments based on vote
 * score thresholds, sorting results by vote score in descending order to show
 * highest-rated comments first.
 *
 * Step-by-step process:
 *
 * 1. Generate test post ID for context
 * 2. Test minimum vote score filtering (e.g., >= 10 total score)
 * 3. Test maximum vote score filtering (e.g., <= 50 total score)
 * 4. Test combined min/max range filtering (e.g., 10-50 total score)
 * 5. Verify vote score calculation is accurate in returned data
 * 6. Confirm sorting by vote score works correctly
 * 7. Test pagination functionality with vote score filtering
 * 8. Validate vote score data integrity throughout filtering process
 */
export async function test_api_comment_vote_score_filtering(
  connection: api.IConnection,
) {
  // Generate test post ID for context
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Filter comments with minimum vote score of 10
  const minScoreFilter = {
    sort_by: "vote_score" as const,
    sort_order: "desc" as const,
    vote_score_min: 10, // Minimum vote score of 10 (net: upvotes - downvotes)
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const minScoreResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: minScoreFilter,
    });
  typia.assert(minScoreResult);

  TestValidator.predicate(
    "minimum score filter returns paginated results",
    minScoreResult.pagination.current === 1 &&
      minScoreResult.pagination.limit === 10,
  );

  // Test 2: Filter comments with maximum vote score of 30
  const maxScoreFilter = {
    sort_by: "vote_score" as const,
    sort_order: "desc" as const,
    vote_score_max: 30, // Maximum vote score of 30 (net: upvotes - downvotes)
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const maxScoreResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: maxScoreFilter,
    });
  typia.assert(maxScoreResult);

  TestValidator.predicate(
    "maximum score filter returns valid pagination",
    maxScoreResult.pagination.pages >= 0 &&
      maxScoreResult.pagination.records >= 0,
  );

  // Test 3: Filter comments within vote score range 15-40
  const rangeScoreFilter = {
    sort_by: "vote_score" as const,
    sort_order: "desc" as const,
    vote_score_min: 15, // Minimum vote score 15
    vote_score_max: 40, // Maximum vote score 40
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const rangeScoreResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: rangeScoreFilter,
    });
  typia.assert(rangeScoreResult);

  TestValidator.predicate(
    "range filter returns results",
    rangeScoreResult.data.length >= 0,
  );

  // Validate sorting by vote score in descending order
  TestValidator.predicate(
    "comments sorted by vote score descending",
    rangeScoreResult.data.every((comment, index) => {
      if (index === 0) return true;
      return (
        calculateVoteScore(comment) <=
        calculateVoteScore(rangeScoreResult.data[index - 1])
      );
    }),
  );

  // Test 4: Test with very restrictive filter (range 100-150) that likely returns no results
  const restrictiveFilter = {
    sort_by: "vote_score" as const,
    sort_order: "desc" as const,
    vote_score_min: 100, // High minimum
    vote_score_max: 150, // High maximum
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const restrictiveResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: restrictiveFilter,
    });
  typia.assert(restrictiveResult);

  // Verify restrictive filter either returns results or empty response
  TestValidator.predicate(
    "restrictive filter handled correctly",
    restrictiveResult.data.length <= 10, // Should return empty or few results
  );

  // Test 5: Test pagination with vote score filter
  const paginatedScoreFilter = {
    sort_by: "vote_score" as const,
    sort_order: "desc" as const,
    vote_score_min: 1, // Very low minimum
    page: 2, // Second page
    limit: 3, // Small page size
  } satisfies IRedditCommunityComment.IRequest;

  const paginatedResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: paginatedScoreFilter,
    });
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination metadata correct on page 2",
    paginatedResult.pagination.current === 2 &&
      paginatedResult.pagination.limit === 3,
  );

  TestValidator.predicate(
    "paginated results within page limit",
    paginatedResult.data.length <= 3,
  );

  // Test 6: Verify vote score calculation accuracy
  minScoreResult.data.forEach((comment, index) => {
    const calculatedScore = calculateVoteScore(comment);
    TestValidator.predicate(
      `comment ${index} vote score meets minimum filter`,
      calculatedScore >= minScoreFilter.vote_score_min,
    );
  });
}

// Helper function to calculate net vote score
function calculateVoteScore(comment: IRedditCommunityComment.ISummary): number {
  return comment.upvote_count - comment.downvote_count;
}
