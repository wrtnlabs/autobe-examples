import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone comment vote data for E2E testing.
 *
 * Generates a complete IRedditCloneCommentVote.ICreate with randomized vote type.
 * The vote_type can be "upvote" to increase comment score by 1, "downvote" to
 * decrease score by 1, or null to remove the vote entirely.
 */
export function prepare_random_reddit_clone_comment_vote(
  input?: DeepPartial<IRedditCloneCommentVote.ICreate> | undefined,
): IRedditCloneCommentVote.ICreate {
  return {
    vote_type:
      input?.vote_type ??
      RandomGenerator.pick(["upvote", "downvote", null] as const),
  };
}
