import { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_vote_of_moderator(
  input?: DeepPartial<ICommunityPlatformPostVoteOfModerator.ICreate>,
): ICommunityPlatformPostVoteOfModerator.ICreate {
  return {
    communityPlatformModeratorId:
      input?.communityPlatformModeratorId ??
      typia.random<string & tags.Format<"uuid">>(),
    communityPlatformPostVoteId:
      input?.communityPlatformPostVoteId ??
      typia.random<string & tags.Format<"uuid">>(),
    voteType:
      input?.voteType ?? RandomGenerator.pick(["upvote", "downvote"] as const),
  };
}
