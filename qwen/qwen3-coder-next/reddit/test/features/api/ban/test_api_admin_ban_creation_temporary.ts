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

export async function test_api_admin_ban_creation_temporary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUser = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(),
        display_name: null,
        bio: null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminSession = await api.functional.redditPlatform.auth.admin.login(
    adminLoginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditPlatformAdmin.ILogin,
    },
  );
  typia.assert(adminSession);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Register member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUser = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.name(),
        displayName: null,
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberUser);
  // 4. Create temporary ban
  const banExpiration = new Date();
  banExpiration.setHours(banExpiration.getHours() + 24); // 24 hours from now
  const ban =
    await api.functional.redditPlatform.admin.redditPlatform.bans.create(
      adminLoginConnection,
      {
        body: {
          community_id: community.id,
          user_id: memberUser.id,
          reason: "Spamming inappropriate content",
          expired_at: banExpiration.toISOString(),
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Verify ban record
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.equals("user matches", ban.user.id, memberUser.id);
  TestValidator.equals(
    "reason matches",
    ban.reason,
    "Spamming inappropriate content",
  );
  TestValidator.equals("bannedBy matches", ban.bannedBy.id, adminSession.id);
  // Verify ban was created after the member joined
  TestValidator.predicate(
    "ban created after member join",
    ban.bannedAt > memberUser.created_at,
  );
  // Verify expiration time is in the future (temporary ban)
  const now = new Date();
  TestValidator.predicate(
    "expiration is in the future",
    ban.expiredAt !== null && new Date(ban.expiredAt) > now,
  );
}
