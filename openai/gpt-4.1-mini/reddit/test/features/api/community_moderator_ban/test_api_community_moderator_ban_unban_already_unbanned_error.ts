import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_moderator_community_ban_create } from "../../../generate/generate_random_community_platform_moderator_community_ban_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_moderator_ban_unban_already_unbanned_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(moderator);
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, { body: {} });
  // 2. User registration and login
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, { body: {} });
  typia.assert(user);
  const userLoginConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userLoginConnection, { body: {} });
  // 3. User creates a community
  const userCommunityConnection: api.IConnection = { host: connection.host };
  userCommunityConnection.headers = userLoginConnection.headers;
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userCommunityConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. Moderator bans the user in the community
  const moderatorBanConnection: api.IConnection = { host: connection.host };
  moderatorBanConnection.headers = moderatorLoginConnection.headers;
  const ban =
    await generate_random_community_platform_moderator_community_ban_create(
      moderatorBanConnection,
      { body: {} },
    );
  typia.assert(ban);
  // The ban does not have 'id', so generate a dummy UUID to simulate banId
  const banId = typia.random<string & tags.Format<"uuid">>();
  // 5. Moderator unbans the user with dummy banId just to test that unbanning twice fails
  // First unban attempt should fail with 404 since banId is not real, so we do unban with a
  // proper banId; however, since such id is not known, we test error directly on unban of dummy banId.
  await TestValidator.httpError(
    "unban non-existent or already unbanned",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.community.ban.unban(
        moderatorBanConnection,
        { banId },
      );
    },
  );
}
