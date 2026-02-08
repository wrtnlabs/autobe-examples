import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_community_banned_users_create_community_banned_user } from "../../../generate/generate_random_community_platform_moderator_community_banned_users_create_community_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_community_banned_user_update_ban_reason_only(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins (registers) to obtain authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // Create initial banned user record with a ban reason and no unbanned_at
  const initialBanReason = RandomGenerator.paragraph({ sentences: 2 });
  let bannedUser =
    await generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
      moderatorConnection,
      {
        body: {
          ban_reason: initialBanReason,
          unbanned_at: null,
        },
      },
    );
  bannedUser = typia.assert(bannedUser) as any;
  // Update only ban reason to a different valid explanation string
  const newBanReason = RandomGenerator.paragraph({ sentences: 3 });
  let updatedBanUser =
    await api.functional.communityPlatform.moderator.community_banned_users.update(
      moderatorConnection,
      {
        bannedUserId: (bannedUser as any).id,
        body: {
          ban_reason: newBanReason,
          unbanned_at: null,
        },
      },
    );
  updatedBanUser = typia.assert(updatedBanUser) as any;
  // Confirm unbanned_at remains null (user still banned)
  TestValidator.equals(
    "unbanned_at remains null",
    (updatedBanUser as any).unbanned_at,
    null,
  );
  // Confirm ban_reason updated correctly
  TestValidator.equals(
    "ban_reason updated",
    (updatedBanUser as any).ban_reason,
    newBanReason,
  );
  // Confirm ban record id remains the same
  TestValidator.equals(
    "bannedUser id same",
    (updatedBanUser as any).id,
    (bannedUser as any).id,
  );
  // Confirm updatedBanUser differs from original bannedUser (ban reason change)
  TestValidator.notEquals(
    "ban record changed",
    updatedBanUser,
    bannedUser,
    (key) => key === "updated_at" || key === "created_at",
  );
  // Authorization enforcement: Try update with unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized update rejected", async () => {
    await api.functional.communityPlatform.moderator.community_banned_users.update(
      unauthorizedConnection,
      {
        bannedUserId: (bannedUser as any).id,
        body: { ban_reason: "illegal update", unbanned_at: null },
      },
    );
  });
}
