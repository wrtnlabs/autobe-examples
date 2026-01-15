import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVoteSummary";
export async function test_api_comment_vote_summary_zero_votes(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random comment ID for testing
  const commentId: string = typia.random<string & tags.Format<"uuid">>();
  // Call the votes summary endpoint for the comment with no votes
  const voteSummary: IDiscussionBoardCommentVoteSummary =
    await api.functional.discussionBoard.comments.votes.index(connection, {
      commentId,
    });
  // Validate that all vote counts are zero
  TestValidator.equals("upvote_count should be 0", voteSummary.upvote_count, 0);
  TestValidator.equals(
    "downvote_count should be 0",
    voteSummary.downvote_count,
    0,
  );
  TestValidator.equals(
    "net_vote_count should be 0",
    voteSummary.net_vote_count,
    0,
  );
  // Verify the structure and type safety of the response
  typia.assert(voteSummary);
}
