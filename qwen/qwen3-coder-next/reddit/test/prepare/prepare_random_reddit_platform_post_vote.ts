import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_post_vote(
  input?: DeepPartial<IRedditPlatformPostVote.ICreate>,
): IRedditPlatformPostVote.ICreate {
  return {
    vote_type:
      input?.vote_type ??
      RandomGenerator.pick(["UPVOTE", "DOWNVOTE", "NONE"] as const),
  };
}
