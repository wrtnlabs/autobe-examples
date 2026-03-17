import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_vote(
  input?: DeepPartial<IRedditCloneVote.ICreate>,
): IRedditCloneVote.ICreate {
  return {
    vote_type:
      input?.vote_type ??
      RandomGenerator.pick(["UPVOTE", "DOWNVOTE", null] as const),
  };
}
