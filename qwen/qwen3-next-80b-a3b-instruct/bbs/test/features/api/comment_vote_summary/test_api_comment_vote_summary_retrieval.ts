import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVoteSummary";
export async function test_api_comment_vote_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random comment ID with valid UUID format
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the vote summary for the generated comment ID
  const voteSummary: IDiscussionBoardCommentVoteSummary =
    await api.functional.discussionBoard.comments.votes.index(connection, {
      commentId,
    });
  typia.assert(voteSummary);
  // Validate vote summary structure and constraints
  TestValidator.predicate(
    "upvote_count is non-negative integer",
    voteSummary.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote_count is non-negative integer",
    voteSummary.downvote_count >= 0,
  );
  TestValidator.equals(
    "net_vote_count calculation",
    voteSummary.net_vote_count,
    voteSummary.upvote_count - voteSummary.downvote_count,
  );
}
