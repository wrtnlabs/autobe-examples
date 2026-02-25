import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_post_vote(
  input?: DeepPartial<ICommunityPostVote.ICreate>,
): ICommunityPostVote.ICreate {
  return {
    vote: input?.vote ?? RandomGenerator.pick([1, -1, 0] as const),
  };
}
