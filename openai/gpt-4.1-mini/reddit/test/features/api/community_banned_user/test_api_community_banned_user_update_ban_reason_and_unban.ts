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

export async function test_api_community_banned_user_update_ban_reason_and_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };

  // 2. Create banned user record
  const bannedUserRaw =
    await generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(bannedUserRaw);

  // Assert bannedUserRaw as unknown and extract id safely
  const bannedUser = bannedUserRaw as unknown as { id: string & tags.Format<"uuid"> };

  // 3. Update ban reason and unban (set unbanned_at to now)
  const newBanReason = RandomGenerator.paragraph({ sentences: 3 });
  const unbannedAt = new Date().toISOString();
  const updatedBannedUserRaw =
    await api.functional.communityPlatform.moderator.community_banned_users.update(
      moderatorConnection,
      {
        bannedUserId: bannedUser.id,
        body: {
          ban_reason: newBanReason,
          unbanned_at: unbannedAt,
        },
      },
    );
  typia.assert(updatedBannedUserRaw);

  const updatedBannedUser = updatedBannedUserRaw as unknown as {
    ban_reason: string;
    unbanned_at: string | null;
  };

  // 4. Confirm updated fields
  TestValidator.equals(
    "ban reason updated",
    updatedBannedUser.ban_reason,
    newBanReason,
  );
  TestValidator.equals(
    "unbanned_at updated",
    updatedBannedUser.unbanned_at,
    unbannedAt,
  );

  // 5. Authorization test: non-moderator cannot update
  const otherConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update rejection",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.community_banned_users.update(
        otherConnection,
        {
          bannedUserId: bannedUser.id,
          body: {
            ban_reason: newBanReason,
          },
        },
      );
    },
  );

  // 6. Error test: update non-existent bannedUserId
  await TestValidator.httpError(
    "update non-existent bannedUserId",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.community_banned_users.update(
        moderatorConnection,
        {
          bannedUserId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ban_reason: "some reason",
          },
        },
      );
    },
  );
}
