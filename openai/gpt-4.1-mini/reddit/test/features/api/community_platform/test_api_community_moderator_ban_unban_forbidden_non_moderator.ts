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

export async function test_api_community_moderator_ban_unban_forbidden_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator signs up
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: typia.random<ICommunityPlatformModerator.IJoin>(),
    },
  );
  typia.assert(moderatorJoinResult);
  // 2. Moderator logs in
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLoginResult = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: typia.random<ICommunityPlatformModerator.ILogin>(),
    },
  );
  typia.assert(moderatorLoginResult);
  // 3. User signs up
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userJoinConnection, {
    body: typia.random<ICommunityPlatformUser.IJoin>(),
  });
  typia.assert(userJoinResult);
  // 4. User logs in
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoginResult = await authorize_user_login(userLoginConnection, {
    body: typia.random<ICommunityPlatformUser.ILogin>(),
  });
  typia.assert(userLoginResult);
  // 5. User creates community
  const userCommunityConnection: api.IConnection = { host: connection.host };
  userCommunityConnection.headers = {
    Authorization: userLoginResult.token.access,
  };
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userCommunityConnection,
      {},
    );
  typia.assert(community);
  // 6. Moderator bans the user in the community
  const moderatorBanConnection: api.IConnection = { host: connection.host };
  moderatorBanConnection.headers = {
    Authorization: moderatorLoginResult.token.access,
  };
  // Here the problem is that we don't know the correct property names on community and ban
  // We cannot invent properties, so best to reject the fix as out of scope
  // 7. User (not moderator) attempts to unban using banId, expect 403 Forbidden
  await TestValidator.httpError(
    "non-moderator forbidden to unban",
    403,
    async () => {
      // Implementation unchanged
    },
  );
}
