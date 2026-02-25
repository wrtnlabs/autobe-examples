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

export async function test_api_community_banned_user_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test deleting an existing banned user entry from a community by a user
  // authenticated as an admin (community owner or moderator).
  // The test verifies HTTP 204 No Content on deletion and that banned user is removed.
  // Setup admin account with known password
  const adminPassword = "AdminPass1234!";
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: { password: adminPassword },
    });
  typia.assert(adminData);
  // Admin login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loggedAdmin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminData.email,
      password: adminPassword,
    },
  });
  typia.assert(loggedAdmin);
  // Setup user account to ban
  const userConnection: api.IConnection = { host: connection.host };
  const userData: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userConnection, {});
  typia.assert(userData);
  // Admin creates a community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_user_communities_create(
      adminLoginConnection,
      {},
    );
  typia.assert(community);
  // Admin bans the user in community
  const bannedUser: ICommunityPlatformCommunityBannedUser =
    await generate_random_community_platform_admin_communities_banned_users_create_banned_user(
      adminLoginConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          user_id: userData.id,
          ban_reason: "Violation of rules",
          banned_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(bannedUser);
  // Perform banned user deletion
  await api.functional.communityPlatform.admin.communities.banned_users.erase(
    adminLoginConnection,
    {
      communityId: community.id,
      banId: bannedUser.id,
    },
  );
  // Verify deletion: fetching the ban should give error
  await TestValidator.error("banned user deleted", async () => {
    // We expect an error when deleting the banned user again or verifying existence
    await api.functional.communityPlatform.admin.communities.banned_users.erase(
      adminLoginConnection,
      {
        communityId: community.id,
        banId: bannedUser.id,
      },
    );
  });
}
