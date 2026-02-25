import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_comment_vote(
  input?: DeepPartial<IRedditCloneCommentVote.ICreate> | undefined,
): IRedditCloneCommentVote.ICreate {
  return {
    voteType:
      input?.voteType ??
      RandomGenerator.pick(["upvote", "downvote", "neutral"] as const),
  };
}
