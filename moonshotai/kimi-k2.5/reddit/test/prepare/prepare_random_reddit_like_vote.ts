import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_vote(
  input?: DeepPartial<IRedditLikeVote.ICreate>,
): IRedditLikeVote.ICreate {
  return {
    vote_type:
      input?.vote_type ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}
