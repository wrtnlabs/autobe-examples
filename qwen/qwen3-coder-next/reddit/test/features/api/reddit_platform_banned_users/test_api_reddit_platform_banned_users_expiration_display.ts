import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
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
import { generate_random_reddit_platform_admin_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_ban";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_reddit_platform_banned_users_expiration_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Create community for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create users to ban
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  await authorize_member_join(user1Connection, {
    body: user1Credentials,
  });
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  await authorize_member_join(user2Connection, {
    body: user2Credentials,
  });
  // 4. Get user IDs by logging in with created credentials
  const user1LoginConnection: api.IConnection = { host: connection.host };
  const user1LoginResponse =
    await api.functional.redditPlatform.auth.member.login(
      user1LoginConnection,
      {
        body: {
          email: user1Credentials.email,
          password: "12345678",
        } satisfies IRedditPlatformMember.ILogin,
      },
    );
  typia.assert(user1LoginResponse);
  const user2LoginConnection: api.IConnection = { host: connection.host };
  const user2LoginResponse =
    await api.functional.redditPlatform.auth.member.login(
      user2LoginConnection,
      {
        body: {
          email: user2Credentials.email,
          password: "12345678",
        } satisfies IRedditPlatformMember.ILogin,
      },
    );
  typia.assert(user2LoginResponse);
  // 5. Ban users with both permanent and temporary bans
  // Permanent ban
  const permanentBan =
    await generate_random_reddit_platform_admin_communities_bans_ban(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user1LoginResponse.id,
          reason: "Permanent violation",
          expired_at: null,
          community_id: community.id,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  // Temporary ban (expired in the past)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);
  const temporaryBan =
    await generate_random_reddit_platform_admin_communities_bans_ban(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user2LoginResponse.id,
          reason: "Temporary violation",
          expired_at: pastDate.toISOString(),
          community_id: community.id,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(temporaryBan);
  // 6. Call banned users endpoint
  const bannedUsers =
    await api.functional.redditPlatform.admin.communities.banned_users.index(
      adminConnection,
      { communityId: community.id },
    );
  typia.assert(bannedUsers);
  // 7. Validate banned users response
  TestValidator.equals("banned users count", bannedUsers.data.length, 2);
  // 8. Validate ban records display expiration correctly
  const permanentBanRecord = bannedUsers.data.find(
    (b: IRedditPlatformBan.ISummary) => b.reason === "Permanent violation",
  );
  const temporaryBanRecord = bannedUsers.data.find(
    (b: IRedditPlatformBan.ISummary) => b.reason === "Temporary violation",
  );
  TestValidator.predicate(
    "permanent ban has null expired_at",
    () => permanentBanRecord?.expired_at === null,
  );
  TestValidator.predicate(
    "temporary ban has non-null expired_at",
    () => temporaryBanRecord?.expired_at !== null,
  );
  // 9. Validate date-time format for temporary ban expiration
  if (temporaryBanRecord?.expired_at) {
    TestValidator.predicate("expired_at is valid ISO 8601 date-time", () => {
      const dateValue = typia.assert<string & tags.Format<"date-time">>(
        temporaryBanRecord.expired_at,
      );
      const date = new Date(dateValue);
      return !isNaN(date.getTime());
    });
  }
  // 10. Validate ban metadata
  TestValidator.equals(
    "permanent ban reason",
    permanentBanRecord?.reason,
    "Permanent violation",
  );
  TestValidator.equals(
    "temporary ban reason",
    temporaryBanRecord?.reason,
    "Temporary violation",
  );
  TestValidator.predicate("ban created_at exists", () => {
    return (
      permanentBanRecord?.created_at !== undefined &&
      temporaryBanRecord?.created_at !== undefined
    );
  });
}
