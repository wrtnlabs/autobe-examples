import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_admin_communities_banned_users_create_banned_user";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_admin_community_banned_user_creation_duplicate_ban_error(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the edge case where an admin attempts to ban a user who is already banned in the same community.
  // 1) Admin user registers (join).
  // 2) User registers (join).
  // 3) User creates a community.
  // 4) Initial ban of the targeted user succeeds.
  // 5) The admin attempts to ban the same user again and expects a conflict or error response indicating duplicate banning is not allowed.
  // 1) Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminJoinResult);
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    },
  });
  typia.assert(adminLoginResult);
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: adminLoginResult.token.access,
  };
  // 2) User join
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinResult = await authorize_user_join(userConnection, {
    body: { password: userPassword },
  });
  typia.assert(userJoinResult);
  // 3) User login to create community
  const userLoginResult = await authorize_user_login(userConnection, {
    body: {
      email: userJoinResult.email,
      password: userPassword,
    },
  });
  typia.assert(userLoginResult);
  userConnection.headers = {
    ...(userConnection.headers ?? {}),
    Authorization: userLoginResult.token.access,
  };
  // 4) User creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 5) Admin bans the user
  const banBody: ICommunityPlatformCommunityBannedUser.ICreate = {
    user_id: userJoinResult.id,
    ban_reason: `Violation - ${RandomGenerator.paragraph({ sentences: 1 })}`,
    banned_at: new Date().toISOString(),
  };
  const banResult =
    await generate_random_community_platform_admin_communities_banned_users_create_banned_user(
      adminConnection,
      {
        params: { communityId: community.id },
        body: banBody,
      },
    );
  typia.assert(banResult);
  // 6) Attempt duplicate ban, expect error
  await TestValidator.error("duplicate ban error", async () => {
    await generate_random_community_platform_admin_communities_banned_users_create_banned_user(
      adminConnection,
      {
        params: { communityId: community.id },
        body: banBody,
      },
    );
  });
}
