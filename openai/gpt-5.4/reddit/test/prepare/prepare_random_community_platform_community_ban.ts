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
    community_platform_member_id:
      input?.community_platform_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    started_at:
      input?.started_at ??
      RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30).toISOString(),
    expired_at:
      input?.expired_at !== undefined
        ? input.expired_at
        : RandomGenerator.pick([true, false] as const)
          ? RandomGenerator.date(
              new Date(Date.now() + 1000 * 60 * 60),
              1000 * 60 * 60 * 24 * 30,
            ).toISOString()
          : null,
  };
}
