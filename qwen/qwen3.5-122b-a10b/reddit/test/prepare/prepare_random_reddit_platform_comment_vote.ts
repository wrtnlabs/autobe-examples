import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_comment_vote(
  input?: DeepPartial<IRedditPlatformCommentVote.ICreate>,
): IRedditPlatformCommentVote.ICreate {
  return {
    vote_type: input?.vote_type ?? RandomGenerator.pick([1, -1] as const),
  };
}
