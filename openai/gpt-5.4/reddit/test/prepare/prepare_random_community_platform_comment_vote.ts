import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_vote(
  input?: DeepPartial<ICommunityPlatformCommentVote.ICreate>,
): ICommunityPlatformCommentVote.ICreate {
  return {
    direction:
      input?.direction ?? RandomGenerator.pick(["up", "down"] as const),
  };
}
