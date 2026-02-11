import { ICommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_vote(
  input?: DeepPartial<ICommunityVote.ICreate>,
): ICommunityVote.ICreate {
  return {
    type: input?.type ?? typia.random<"up" | "down">(),
  };
}
