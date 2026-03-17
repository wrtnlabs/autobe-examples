import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderation_role(
  input?: DeepPartial<ICommunityPlatformModerationRole.ICreate> | undefined,
): ICommunityPlatformModerationRole.ICreate {
  return {
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
    roleType: input?.roleType ?? "moderator",
  };
}
