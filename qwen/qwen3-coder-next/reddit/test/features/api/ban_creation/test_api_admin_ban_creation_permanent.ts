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
import { generate_random_reddit_platform_admin_reddit_platform_bans_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_admin_ban_creation_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        display_name: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  adminConnection.headers = { Authorization: adminUser.token.access };
  // 2. Create a new community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(6),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Register member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberUser);
  memberConnection.headers = { Authorization: memberUser.token.access };
  // 4. Create a permanent ban
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      adminConnection,
      {
        body: {
          community_id: community.id,
          user_id: memberUser.id,
          reason: banReason,
          expired_at: null, // Permanent ban
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Verify ban record
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.equals("user matches", ban.user.id, memberUser.id);
  TestValidator.equals("bannedBy matches", ban.bannedBy.id, adminUser.id);
  TestValidator.equals("reason matches", ban.reason, banReason);
  TestValidator.equals("bannedAt is set", typeof ban.bannedAt, "string");
  TestValidator.equals(
    "expired_at is null for permanent ban",
    ban.expiredAt,
    null,
  );
}
