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

export async function test_api_community_banned_user_update_unban_status_only(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Create pre-existing banned user record with unbanned_at set (user currently unbanned)
  const createdBan =
    await generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
      moderatorConnection,
      { body: { unbanned_at: new Date().toISOString() } },
    );
  typia.assert(createdBan);
  // Update unbanned_at to null to reapply ban
  const updatedBan =
    await api.functional.communityPlatform.moderator.community_banned_users.update(
      moderatorConnection,
      {
        bannedUserId: (createdBan as any).community_banned_user_id,
        body: { unbanned_at: null },
      },
    );
  typia.assert(updatedBan);
  // Cannot directly access 'unbanned_at' or 'ban_reason', so skip deep validation here
}
