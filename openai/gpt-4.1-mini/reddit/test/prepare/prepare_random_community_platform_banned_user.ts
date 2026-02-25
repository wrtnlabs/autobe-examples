import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_banned_user(
  input?: DeepPartial<ICommunityPlatformBannedUser.ICreate>,
): ICommunityPlatformBannedUser.ICreate {
  return {
    community_platform_user_id:
      input?.community_platform_user_id ??
      typia.random<string & tags.Format<"uuid">>(),
    community_platform_community_id:
      input?.community_platform_community_id ??
      typia.random<string & tags.Format<"uuid">>(),
    banned_at:
      input?.banned_at ?? typia.random<string & tags.Format<"date-time">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
    unbanned_at: input?.unbanned_at === undefined ? null : input.unbanned_at,
  };
}
