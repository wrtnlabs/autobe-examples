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
    direction: input?.direction ?? typia.random<number & tags.Type<"int32">>(),
  };
}
