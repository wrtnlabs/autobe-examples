import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_bans_filtering_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  const today = new Date();
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
      username: "admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create 2 test members to ban
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: "member1@test.com",
      username: "member1",
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: "member2@test.com",
      username: "member2",
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Get member IDs by logging in
  const member1Login = await api.functional.redditPlatform.auth.member.login(
    member1Connection,
    {
      body: {
        email: "member1@test.com",
        password: "password123",
      } satisfies IRedditPlatformMember.ILogin,
    },
  );
  typia.assert(member1Login);
  const member2Login = await api.functional.redditPlatform.auth.member.login(
    member2Connection,
    {
      body: {
        email: "member2@test.com",
        password: "password123",
      } satisfies IRedditPlatformMember.ILogin,
    },
  );
  typia.assert(member2Login);
  // 4. Admin logs in to create community
  const adminLoginConn: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConn, {
    body: {
      email: "admin@test.com",
      password: "admin123",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 5. Create test community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminLoginConn,
      {
        body: {
          name: "BanFilterTest",
          description: "Test community for ban filtering",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 6. Create 2 active bans today
  const ban1 =
    await api.functional.redditPlatform.member.communities.bans.create(
      adminLoginConn,
      {
        communityId: community.id,
        body: {
          user_id: member1Login.id,
          expires_at: null, // permanent ban
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban1);
  const ban2 =
    await api.functional.redditPlatform.member.communities.bans.create(
      adminLoginConn,
      {
        communityId: community.id,
        body: {
          user_id: member2Login.id,
          expires_at: null, // permanent ban
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban2);
  // 7. Test status=active filter - should return 2 bans
  const activeFilterRequest = {
    status: "active" as const,
  } satisfies IRedditPlatformCommunityBan.IRequest;
  const activeResult = await api.functional.redditPlatform.admin.bans.index(
    adminLoginConn,
    {
      body: activeFilterRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.equals(
    "active filter - record count",
    activeResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "active filter - data length",
    activeResult.data.length,
    2,
  );
  // Verify all returned bans are active
  for (const ban of activeResult.data) {
    TestValidator.predicate(
      `active ban ${ban.id} isActive`,
      ban.isActive === true,
    );
  }
  // 8. Test status=expired filter - should return 0 (no expired bans exist)
  const expiredFilterRequest = {
    status: "expired" as const,
  } satisfies IRedditPlatformCommunityBan.IRequest;
  const expiredResult = await api.functional.redditPlatform.admin.bans.index(
    adminLoginConn,
    {
      body: expiredFilterRequest,
    },
  );
  typia.assert(expiredResult);
  TestValidator.equals(
    "expired filter - record count",
    expiredResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired filter - data length",
    expiredResult.data.length,
    0,
  );
  // 9. Test status=removed filter - should return 0 (no removed bans exist)
  const removedFilterRequest = {
    status: "removed" as const,
  } satisfies IRedditPlatformCommunityBan.IRequest;
  const removedResult = await api.functional.redditPlatform.admin.bans.index(
    adminLoginConn,
    {
      body: removedFilterRequest,
    },
  );
  typia.assert(removedResult);
  TestValidator.equals(
    "removed filter - record count",
    removedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "removed filter - data length",
    removedResult.data.length,
    0,
  );
  // 10. Test date range filter (2 days ago to today) - should return 2 bans
  const dateRangeFilterRequest = {
    startDate: twoDaysAgo.toISOString(),
    endDate: today.toISOString(),
  } satisfies IRedditPlatformCommunityBan.IRequest;
  const dateRangeResult = await api.functional.redditPlatform.admin.bans.index(
    adminLoginConn,
    {
      body: dateRangeFilterRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter - record count",
    dateRangeResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "date range filter - data length",
    dateRangeResult.data.length,
    2,
  );
  // 11. Test combined filters (status=active AND date range) - should return 2 bans
  const combinedFilterRequest = {
    status: "active" as const,
    startDate: twoDaysAgo.toISOString(),
    endDate: today.toISOString(),
  } satisfies IRedditPlatformCommunityBan.IRequest;
  const combinedResult = await api.functional.redditPlatform.admin.bans.index(
    adminLoginConn,
    {
      body: combinedFilterRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter - record count",
    combinedResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "combined filter - data length",
    combinedResult.data.length,
    2,
  );
  // Verify combined filter results are active
  for (const ban of combinedResult.data) {
    TestValidator.predicate(
      `combined filter ban ${ban.id} isActive`,
      ban.isActive === true,
    );
  }
  // 12. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    activeResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination pages", activeResult.pagination.pages, 1);
  TestValidator.equals(
    "pagination records matches data",
    activeResult.pagination.records,
    activeResult.data.length,
  );
}
