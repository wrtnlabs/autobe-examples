import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_vote(
  input?: DeepPartial<ICommunityPlatformPostVote.ICreate>,
): ICommunityPlatformPostVote.ICreate {
  return {
    targetType:
      input?.targetType ?? RandomGenerator.pick(["post", "comment"] as const),
    targetId: input?.targetId ?? typia.random<string & tags.Format<"uuid">>(),
    voteType:
      input?.voteType ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}
