import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_comment_vote(
  input?: DeepPartial<ICommunityCommentVote.ICreate> | undefined,
): ICommunityCommentVote.ICreate {
  return {
    voteType: input?.voteType ?? RandomGenerator.pick(["up", "down"] as const),
  };
}
