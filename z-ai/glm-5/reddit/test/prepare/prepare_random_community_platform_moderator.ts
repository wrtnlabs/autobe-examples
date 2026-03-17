import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderator(
  input?: DeepPartial<ICommunityPlatformModerator.ICreate>,
): ICommunityPlatformModerator.ICreate {
  return {
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
