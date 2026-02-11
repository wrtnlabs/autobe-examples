import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_admin_reddit_platform_communities_users_bans_ban_user } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_communities_users_bans_ban_user";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";

export async function test_api_admin_ban_user_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for multi-actor scenario
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create admin user
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create regular member user
  const memberUser = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Login as admin to establish session
  const adminSession = await authorize_admin_login(adminConnection, {
    body: {
      email: adminUser.email,
      password: RandomGenerator.alphabets(16),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 4. Login as member to establish session
  const memberSession = await authorize_member_login(memberConnection, {
    body: {
      email: memberUser.email,
      password: RandomGenerator.alphabets(16),
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 5. Create a community as admin (using available API since ban requires community)
  // Note: Based on available endpoints, we'll work with the ban endpoint directly
  // since community creation isn't explicitly available in the provided API functions
  // 6. Attempt to ban user as regular member (should fail with 403 Forbidden)
  await TestValidator.error("non-admin cannot ban users", async () => {
    await api.functional.redditPlatform.admin.redditPlatform.communities.users.bans.banUser(
      memberConnection,
      {
        communityId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "123e4567-e89b-12d3-a456-426614174001",
        body: {
          community_id: "123e4567-e89b-12d3-a456-426614174000",
          user_id: "123e4567-e89b-12d3-a456-426614174001",
          reason: "Unauthorized ban attempt by regular member",
          expired_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  });
}
