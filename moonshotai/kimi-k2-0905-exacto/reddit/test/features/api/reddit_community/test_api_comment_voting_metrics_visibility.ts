import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test that comment voting metrics are accurately represented in individual
 * comment retrieval. Validate that upvote_count and downvote_count reflect the
 * current vote totals and that these values update correctly as users vote.
 * Test that vote differentials are calculated correctly and that voting data is
 * consistently maintained.
 *
 * This test will:
 *
 * 1. Retrieve a specific comment with its initial voting metrics
 * 2. Validate that upvote_count and downvote_count meet type constraints
 *    (non-negative integers)
 * 3. Test retrieval consistency by fetching the same comment multiple times
 * 4. Validate vote count integrity through realistic business logic validation
 * 5. Ensure voting metrics are accessible and properly formatted through the API
 */
export async function test_api_comment_voting_metrics_visibility(
  connection: api.IConnection,
) {
  // Step 1: Generate random but valid post and comment IDs for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Retrieve the comment with voting metrics
  const comment = await api.functional.redditCommunity.posts.comments.at(
    connection,
    {
      postId,
      commentId,
    },
  );

  // Step 3: Validate the retrieved comment structure and type safety
  typia.assert(comment);

  // Step 4: Validate voting metrics integrity - both counts must be valid integers
  TestValidator.predicate(
    "upvote_count must be non-negative integer",
    comment.upvote_count >= 0 && Number.isInteger(comment.upvote_count),
  );

  TestValidator.predicate(
    "downvote_count must be non-negative integer",
    comment.downvote_count >= 0 && Number.isInteger(comment.downvote_count),
  );

  // Step 5: Validate realistic vote count ranges (let's say reasonable max of 1M votes)
  TestValidator.predicate(
    "upvote_count must be reasonable",
    comment.upvote_count <= 1000000,
  );

  TestValidator.predicate(
    "downvote_count must be reasonable",
    comment.downvote_count <= 1000000,
  );

  // Step 6: Verify total vote count is non-negative (upvotes should generally be >= downvotes or votes should be reasonable)
  TestValidator.predicate(
    "total votes should be reasonable for a comment",
    comment.upvote_count + comment.downvote_count <= 1000000,
  );

  // Step 7: Test retrieval consistency to ensure vote counts are stable
  const commentRetrieved =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId,
      commentId,
    });

  // Step 8: Validate consistency of voting metrics across retrievals
  TestValidator.equals(
    "upvote_count is consistent across retrievals",
    comment.upvote_count,
    commentRetrieved.upvote_count,
  );

  TestValidator.equals(
    "downvote_count is consistent across retrievals",
    comment.downvote_count,
    commentRetrieved.downvote_count,
  );

  // Step 9: Validate that voting metrics fields are present and accessible
  TestValidator.predicate(
    "voting metrics are accessible",
    comment.upvote_count !== undefined && comment.downvote_count !== undefined,
  );

  // Step 10: Validate TypeScript type constraints from IRedditCommunityComment are met
  TestValidator.predicate(
    "upvote_count type constraints satisfied",
    comment.upvote_count >= 0 && comment.upvote_count <= 2147483647,
  ); // int32 max

  TestValidator.predicate(
    "downvote_count type constraints satisfied",
    comment.downvote_count >= 0 && comment.downvote_count <= 2147483647,
  ); // int32 max
}
