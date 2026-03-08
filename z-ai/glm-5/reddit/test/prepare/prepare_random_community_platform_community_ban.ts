import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_ban(
  input?: DeepPartial<ICommunityPlatformCommunityBan.ICreate>,
): ICommunityPlatformCommunityBan.ICreate {
  return {
    bannedUserId:
      input?.bannedUserId ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason !== undefined
        ? input.reason
        : RandomGenerator.paragraph({ sentences: 3 }),
  };
}
