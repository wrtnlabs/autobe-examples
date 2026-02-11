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
import { generate_random_reddit_platform_admin_reddit_platform_bans_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_bans_create";
import { generate_random_reddit_platform_admin_reddit_platform_communities_users_bans_ban_user } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_communities_users_bans_ban_user";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";

export async function test_api_admin_ban_user_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Generate mock data for community and user (since we can't create them via available APIs)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First ban using POST endpoint
  const firstBan =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      adminConnection,
      {
        body: {
          community_id: communityId,
          user_id: userId,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expired_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(firstBan);
  // 4. Attempt duplicate ban using PATCH endpoint - should fail
  await TestValidator.error("duplicate ban should fail", async () => {
    await api.functional.redditPlatform.admin.redditPlatform.communities.users.bans.banUser(
      adminConnection,
      {
        communityId: communityId,
        userId: userId,
        body: {
          community_id: communityId,
          user_id: userId,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expired_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  });
}
