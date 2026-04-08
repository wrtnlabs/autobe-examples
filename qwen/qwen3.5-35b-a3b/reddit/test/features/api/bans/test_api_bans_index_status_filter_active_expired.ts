import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecord";
import type { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_bans_index_status_filter_active_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin member (community owner)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      username: "admin_" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create community (admin becomes owner)
  const communityName = RandomGenerator.alphaNumeric(8);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: communityName,
          description: "Test community for ban status filter testing",
        },
      },
    );
  typia.assert(community);
  // 3. Create user member (target for banning)
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: "user_" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userAuth);
  // 4. Ban user (create first active ban)
  const firstBan: IRedditPlatformBannedUser = typia.assert(
    await api.functional.redditPlatform.member.communities.bans.create(
      adminConnection,
      {
        communityName: community.name,
        body: {
          user_id: userAuth.id,
          reason: "Test ban #1 - will be unbanned",
        },
      },
    ),
  );
  typia.assert(firstBan);
  // Verify first ban is active (unbanned_at is null means active)
  TestValidator.equals(
    "first ban unbanned_at is null",
    firstBan.unbanned_at,
    null,
  );
  // 5. Unban user (transition first ban to expired)
  await api.functional.redditPlatform.member.communities.bans.erase(
    adminConnection,
    {
      communityName: community.name,
      userId: userAuth.id,
    },
  );
  // 6. Create second ban (active again)
  const secondBan: IRedditPlatformBannedUser = typia.assert(
    await api.functional.redditPlatform.member.communities.bans.create(
      adminConnection,
      {
        communityName: community.name,
        body: {
          user_id: userAuth.id,
          reason: "Test ban #2 - remains active",
        },
      },
    ),
  );
  typia.assert(secondBan);
  // Verify second ban is active (unbanned_at is null means active)
  TestValidator.equals(
    "second ban unbanned_at is null",
    secondBan.unbanned_at,
    null,
  );
  // 7. Query with status='active' - should return only second ban
  const activeBans = await api.functional.redditPlatform.member.bans.index(
    adminConnection,
    {
      body: {
        community_id: community.id,
        status: "active",
      },
    },
  );
  typia.assert(activeBans);
  TestValidator.equals(
    "active filter returns correct count",
    activeBans.pagination.records,
    1,
  );
  TestValidator.equals(
    "active filter returns correct page count",
    activeBans.pagination.pages,
    1,
  );
  TestValidator.equals(
    "active filter returns one ban",
    activeBans.data.length,
    1,
  );
  TestValidator.equals(
    "active ban matches second ban",
    activeBans.data[0].id,
    secondBan.id,
  );
  // 8. Query with status='expired' - should return only first ban
  const expiredBans = await api.functional.redditPlatform.member.bans.index(
    adminConnection,
    {
      body: {
        community_id: community.id,
        status: "expired",
      },
    },
  );
  typia.assert(expiredBans);
  TestValidator.equals(
    "expired filter returns correct count",
    expiredBans.pagination.records,
    1,
  );
  TestValidator.equals(
    "expired filter returns correct page count",
    expiredBans.pagination.pages,
    1,
  );
  TestValidator.equals(
    "expired filter returns one ban",
    expiredBans.data.length,
    1,
  );
  TestValidator.equals(
    "expired ban matches first ban",
    expiredBans.data[0].id,
    firstBan.id,
  );
  // 9. Query with status='all' (default) - should return both bans
  const allBans = await api.functional.redditPlatform.member.bans.index(
    adminConnection,
    {
      body: {
        community_id: community.id,
        status: "all",
      },
    },
  );
  typia.assert(allBans);
  TestValidator.equals(
    "all filter returns correct count",
    allBans.pagination.records,
    2,
  );
  TestValidator.equals(
    "all filter returns correct page count",
    allBans.pagination.pages,
    1,
  );
  TestValidator.equals("all filter returns both bans", allBans.data.length, 2);
  // Verify all bans have correct status matching unbanned_at
  for (const ban of allBans.data) {
    if (ban.unbanned_at === null) {
      TestValidator.equals(
        `ban ${ban.id} has active status`,
        ban.status,
        "active",
      );
    } else {
      TestValidator.equals(
        `ban ${ban.id} has expired status`,
        ban.status,
        "expired",
      );
    }
  }
  // Verify pagination respects status filter
  const smallActiveBans = await api.functional.redditPlatform.member.bans.index(
    adminConnection,
    {
      body: {
        community_id: community.id,
        status: "active",
        limit: 1,
      },
    },
  );
  typia.assert(smallActiveBans);
  TestValidator.equals(
    "limit respects active filter",
    smallActiveBans.data.length,
    1,
  );
  const smallExpiredBans =
    await api.functional.redditPlatform.member.bans.index(adminConnection, {
      body: {
        community_id: community.id,
        status: "expired",
        limit: 1,
      },
    });
  typia.assert(smallExpiredBans);
  TestValidator.equals(
    "limit respects expired filter",
    smallExpiredBans.data.length,
    1,
  );
}
