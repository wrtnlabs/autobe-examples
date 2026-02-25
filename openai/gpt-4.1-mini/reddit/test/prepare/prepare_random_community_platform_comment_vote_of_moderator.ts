import { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_vote_of_moderator(
  input?: DeepPartial<ICommunityPlatformCommentVoteOfModerator.ICreate>,
): ICommunityPlatformCommentVoteOfModerator.ICreate {
  return {
    commentVoteId:
      input?.commentVoteId ?? typia.random<string & tags.Format<"uuid">>(),
    vote: input?.vote ?? RandomGenerator.pick([-1, 1] as const),
  };
}
