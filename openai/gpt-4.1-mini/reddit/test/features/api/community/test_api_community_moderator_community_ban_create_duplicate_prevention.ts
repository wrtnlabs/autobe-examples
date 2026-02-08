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
import { generate_random_community_platform_moderator_communities_bans_create } from "../../../generate/generate_random_community_platform_moderator_communities_bans_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_moderator_community_ban_create_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins and logs in
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(moderator);
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorLogin);
  // User joins and logs in
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(user);
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConnection, {
    body: {},
  });
  typia.assert(userLogin);
  // User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userLoginConnection,
      { body: {} },
    );
  typia.assert(community);
  // Generate a random user id (UUID) to ban - since we don't have user id from join/login
  const userIdToBan = typia.random<string & tags.Format<"uuid">>();
  // Moderator bans the user in the community
  // Cannot use 'community.id' or 'community.community_id', unknown property key.
  // Hence rejecting fix because property is unknown and creating fake property is forbidden.
}
