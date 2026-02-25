import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_banned_user(
  input?: DeepPartial<ICommunityPlatformCommunityBannedUser.ICreate>,
): ICommunityPlatformCommunityBannedUser.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    ban_reason:
      input?.ban_reason ?? RandomGenerator.paragraph({ sentences: 1 }),
    banned_at:
      input?.banned_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
