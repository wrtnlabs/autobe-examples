import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_ban(
  input?: DeepPartial<ICommunityPlatformCommunityBan.ICreate> | undefined,
): ICommunityPlatformCommunityBan.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    banned_user_id:
      input?.banned_user_id ?? typia.random<string & tags.Format<"uuid">>(),
    applied_by_moderator_id:
      input?.applied_by_moderator_id ??
      typia.random<string & tags.Format<"uuid">>(),
    banned_at:
      input?.banned_at ?? typia.random<string & tags.Format<"date-time">>(),
    unbanned_at:
      input?.unbanned_at !== undefined
        ? input.unbanned_at
        : Math.random() < 0.5
          ? null
          : typia.random<string & tags.Format<"date-time">>(),
    ban_reason:
      input?.ban_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
