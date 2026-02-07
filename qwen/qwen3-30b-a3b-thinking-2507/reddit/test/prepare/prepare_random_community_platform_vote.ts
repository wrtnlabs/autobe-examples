import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_vote(
  input?: DeepPartial<ICommunityPlatformVote.ICreate> | undefined,
): ICommunityPlatformVote.ICreate {
  return {
    vote_type:
      input?.vote_type ?? RandomGenerator.pick(["up", "down"] as const),
    votable_type:
      input?.votable_type ?? RandomGenerator.pick(["post", "comment"] as const),
    votable_id:
      input?.votable_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
