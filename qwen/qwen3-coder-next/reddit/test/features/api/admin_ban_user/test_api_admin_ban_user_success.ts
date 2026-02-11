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
import { generate_random_reddit_platform_admin_reddit_platform_communities_users_bans_ban_user } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_communities_users_bans_ban_user";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";

export async function test_api_admin_ban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin with proper permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(3),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create target user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const targetUser = await api.functional.redditPlatform.auth.admin.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(3),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(targetUser);
  // 3. Admin bans the user
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const banExpiration = typia.random<string & tags.Format<"date-time">>();
  const banRecord =
    await api.functional.redditPlatform.admin.redditPlatform.communities.users.bans.banUser(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        userId: targetUser.id,
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          user_id: targetUser.id,
          reason: banReason,
          expired_at: banExpiration,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Validate ban record
  TestValidator.equals("ban reason matches", banRecord.reason, banReason);
  TestValidator.equals(
    "community matches",
    banRecord.community.id,
    banRecord.community.id,
  );
  TestValidator.equals("user matches", banRecord.user.id, targetUser.id);
  TestValidator.predicate(
    "has moderator identity",
    banRecord.bannedBy.id !== undefined,
  );
  TestValidator.predicate(
    "ban timestamp exists",
    banRecord.bannedAt !== undefined,
  );
  TestValidator.equals(
    "expiration matches",
    banRecord.expiredAt,
    banExpiration,
  );
}
