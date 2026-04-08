import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving vote summary for a post that has received upvotes resulting in a positive vote score.
 *
 * Validates the vote summary endpoint returns accurate voting statistics including vote score, upvote count, and downvote count. Ensures the mathematical relationship between these fields is maintained correctly.
 *
 * This test verifies the primary success path for vote summary retrieval when a post has community engagement with positive voting activity.
 *
 * 1. Authenticate guest user via join endpoint.
 * 2. Call vote summary endpoint with a valid post UUID.
 * 3. Validate response structure matches IRedditLikePost.IVoteSummary.
 * 4. Verify vote_score equals upvote_count minus downvote_count.
 * 5. Verify vote_score is positive (indicating more upvotes than downvotes).
 * 6. Verify all count fields are non-negative integers.
 */
export async function test_api_post_vote_summary_with_positive_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection);
  typia.assert(auth);
  // 2. Call vote summary endpoint with a valid post UUID
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const summary: IRedditLikePost.IVoteSummary =
    await api.functional.redditLike.guest.posts.vote_summary.voteSummary(
      guestConnection,
      { postId },
    );
  typia.assert(summary);
  // 3. Validate response structure
  TestValidator.equals("post id matches input", summary.id, postId);
  // 4. Verify mathematical relationship: vote_score = upvote_count - downvote_count
  const calculatedScore = summary.upvote_count - summary.downvote_count;
  TestValidator.equals(
    "vote score calculation",
    summary.vote_score,
    calculatedScore,
  );
  // 5. Verify vote_score is positive (more upvotes than downvotes)
  TestValidator.predicate("vote score is positive", summary.vote_score > 0);
  // 6. Verify all count fields are non-negative
  TestValidator.predicate(
    "upvote count is non-negative",
    summary.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote count is non-negative",
    summary.downvote_count >= 0,
  );
}
