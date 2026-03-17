import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
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
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test the admin's ability to filter and search banned users using various criteria.
 * Administrators need to efficiently manage bans by filtering active/inactive bans,
 * searching by username, and using date ranges to find specific bans.
 * This test validates all filtering capabilities described in the specification.
 */
export async function test_api_admin_bans_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create community owned by admin (admin needs to be a member first)
  // First create a member account for the admin
  const adminMemberConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      username: "admin_owner",
      nickname: "Admin Owner",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(adminMember);
  // Create community with admin as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      adminMemberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create test members to be banned with different characteristics
  const testMembers: ICommunityPlatformMember.ISummary[] = [];
  const memberConnections: api.IConnection[] = [];
  // Create 5 test members with different usernames
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: `testuser${i}_${RandomGenerator.alphaNumeric(6)}`,
        nickname: `Test User ${i}`,
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
    typia.assert(member);
    testMembers.push({
      id: member.id,
      email: member.email,
      username: member.username,
      nickname: member.nickname,
      email_verified: member.email_verified,
      registered_at: member.registered_at,
      last_login_at: member.last_login_at,
    } satisfies ICommunityPlatformMember.ISummary);
    memberConnections.push(memberConnection);
  }
  // 4. Create bans with varied characteristics
  const bans: ICommunityPlatformBan[] = [];
  const now = new Date();
  // Active ban with future expiration
  const activeBan = await generate_random_community_platform_member_bans_create(
    adminMemberConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: testMembers[0].id,
        reason: "Rule violation",
        expiresAt: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days future
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(activeBan);
  bans.push(activeBan);
  // Expired ban (past expiration)
  const expiredBan =
    await generate_random_community_platform_member_bans_create(
      adminMemberConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: testMembers[1].id,
          reason: "Previous violation",
          expiresAt: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 day past
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(expiredBan);
  bans.push(expiredBan);
  // Permanent ban (no expiration)
  const permanentBan =
    await generate_random_community_platform_member_bans_create(
      adminMemberConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: testMembers[2].id,
          reason: "Severe violation",
          expiresAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  bans.push(permanentBan);
  // Ban with specific username pattern for search testing
  const searchBan = await generate_random_community_platform_member_bans_create(
    adminMemberConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: testMembers[3].id,
        reason: "Search test ban",
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(searchBan);
  bans.push(searchBan);
  // Ban with different creation time for date range testing
  const dateBan = await generate_random_community_platform_member_bans_create(
    adminMemberConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: testMembers[4].id,
        reason: "Date test ban",
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(dateBan);
  bans.push(dateBan);
  // 5. Test filtering by active status
  // Active filter should return bans with active=true
  const activeBansResponse =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        active: true,
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(activeBansResponse);
  TestValidator.equals(
    "active bans should have active=true",
    activeBansResponse.data.every((ban) => ban.active),
    true,
  );
  // Inactive filter should return bans with active=false
  const inactiveBansResponse =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        active: false,
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(inactiveBansResponse);
  TestValidator.equals(
    "inactive bans should have active=false",
    inactiveBansResponse.data.every((ban) => !ban.active),
    true,
  );
  // 6. Test username search
  const searchUsername = testMembers[3].username.substring(0, 8);
  const usernameSearchResponse =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        username: searchUsername,
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(usernameSearchResponse);
  TestValidator.predicate(
    "username search should return at least one result",
    usernameSearchResponse.data.length > 0,
  );
  // 7. Test date range filtering
  const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        bannedAtFrom: startDate.toISOString(),
        bannedAtTo: endDate.toISOString(),
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter should return results",
    dateRangeResponse.data.length > 0,
  );
  // 8. Test sorting
  const sortedByBannedAtDesc =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        sort: "banned_at",
        direction: "desc",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(sortedByBannedAtDesc);
  // Verify descending order
  for (let i = 1; i < sortedByBannedAtDesc.data.length; i++) {
    const prevDate = new Date(sortedByBannedAtDesc.data[i - 1].banned_at);
    const currDate = new Date(sortedByBannedAtDesc.data[i].banned_at);
    TestValidator.predicate(
      `banned_at should be in descending order at index ${i}`,
      prevDate >= currDate,
    );
  }
  // 9. Test pagination
  const page1Response = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      communityId: community.id,
      body: {
        limit: 2,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 should have correct limit",
    page1Response.data.length,
    2,
  );
  const page2Response = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      communityId: community.id,
      body: {
        limit: 2,
        page: 2,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.predicate(
    "page 2 should have results",
    page2Response.data.length > 0,
  );
  // 10. Test combined filters
  const combinedResponse =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        active: true,
        username: testMembers[0].username.substring(0, 4),
        bannedAtFrom: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filters should return matching results",
    combinedResponse.data.length > 0,
  );
  // 11. Verify pagination metadata accuracy
  const totalActive = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      communityId: community.id,
      body: {
        active: true,
        limit: 100,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(totalActive);
  const page1Limited = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      communityId: community.id,
      body: {
        active: true,
        limit: 2,
        page: 1,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(page1Limited);
  TestValidator.predicate(
    "pagination records should reflect filtered dataset size",
    totalActive.pagination.records >= page1Limited.pagination.records,
  );
}
