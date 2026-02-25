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

export async function test_api_community_banned_user_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin user setup: join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput: Partial<ICommunityPlatformAdmin.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "adminPassword123",
    displayName: "AdminUser",
  };
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(admin);
  // 2. User setup: join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinInput: Partial<ICommunityPlatformUser.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "userPassword123",
    username: "normalUser",
    displayName: "Normal User",
    href: "https://example.com",
    referrer: "https://referrer.example.com",
  };
  const user = await authorize_user_join(userConnection, {
    body: userJoinInput,
  });
  typia.assert(user);
  // We do not need to login the user again since authorize_user_join returns token and sets headers.
  // 3. Non-admin user creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `community-${typia.random<string & tags.Format<"uuid">>()}`,
        },
      },
    );
  typia.assert(community);
  // 4. Admin bans the user in the community
  const bannedUserEntry =
    await generate_random_community_platform_admin_communities_banned_users_create_banned_user(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user.id,
          ban_reason: "Violation of rules",
          banned_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(bannedUserEntry);
  // 5. Non-admin user attempts to delete banned user entry
  await TestValidator.error(
    "non-admin user unauthorized to delete banned user entry",
    async () => {
      await api.functional.communityPlatform.admin.communities.banned_users.erase(
        userConnection,
        {
          communityId: community.id,
          banId: bannedUserEntry.id,
        },
      );
    },
  );
}
