import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
export function prepare_random_community_platform_comment_vote(
  input?: DeepPartial<ICommunityPlatformCommentVote.ICreate> | undefined,
): ICommunityPlatformCommentVote.ICreate {
  return {
    upvote: input?.upvote ?? RandomGenerator.pick([true, false] as const),
  };
}
