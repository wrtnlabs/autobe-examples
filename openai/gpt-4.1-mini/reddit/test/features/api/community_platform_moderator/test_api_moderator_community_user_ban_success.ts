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

export async function test_api_moderator_community_user_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and becomes authorized
  const modConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(modConnection, {
    body: {},
  });
  modConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };

  // 2. Create community ID and banned user ID for test
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Construct ban reason
  const banReason = RandomGenerator.paragraph({ sentences: 2 });

  // 4. Moderator bans the user
  const ban =
    await api.functional.communityPlatform.moderator.communities.banned_users.ban(
      modConnection,
      {
        communityId,
        body: {
          userId: bannedUserId,
          banReason: banReason,
        } satisfies ICommunityPlatformCommunityBannedUser.IBan,
      },
    );

  // Assert the ban object structure without accessing non-existent properties
  typia.assert(ban);

  // 5. Authorization enforcement check (attempt ban with empty/non-authorized connection)
  await TestValidator.error("ban without authorization", async () => {
    await api.functional.communityPlatform.moderator.communities.banned_users.ban(
      connection,
      {
        communityId,
        body: {
          userId: typia.random<string & tags.Format<"uuid">>(),
          banReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityBannedUser.IBan,
      },
    );
  });

  // 6. Verify banned user cannot create posts or comments but can view content
  // NOTE: Since no post or comment-related APIs or utilities are provided,
  // this step is acknowledged but cannot be implemented directly.
  // This comment serves as a placeholder for such validation in a complete suite.
}
