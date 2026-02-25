import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_moderator_banned_users_create_banned_user";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_banned_users_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deleting a banned user record that does not exist.
  // Authenticate as a moderator.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  // Update token header
  moderatorConnection.headers = {
    Authorization: moderatorJoinResult.token.access,
  };
  // Create a user for ban.
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: userJoinResult.token.access };
  // Create a community using userConnection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Ban the user by moderator
  const bannedUser =
    await generate_random_community_platform_moderator_banned_users_create_banned_user(
      moderatorConnection,
      {
        body: {
          community_platform_user_id: userJoinResult.id,
          community_platform_community_id: community.id,
          banned_at: new Date().toISOString(),
          reason: "Violation of rules",
        },
      },
    );
  typia.assert(bannedUser);
  // Try to delete a banned user record that does not exist. Use non-existing UUID.
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete banned user - not found",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.eraseBannedUser(
        moderatorConnection,
        { id: nonExistingId },
      );
    },
  );
}
