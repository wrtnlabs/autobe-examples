import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_post_vote(
  input?: DeepPartial<IRedditClonePostVote.ICreate>,
): IRedditClonePostVote.ICreate {
  return {
    direction:
      input?.direction ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}
