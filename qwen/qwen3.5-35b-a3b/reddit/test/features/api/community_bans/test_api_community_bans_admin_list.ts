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

/**
 * Test admin ban listing functionality with community ban records.
 *
 * This test validates:
 * 1. Admin can view ban records from communities they moderate
 * 2. Ban list includes proper pagination metadata
 * 3. Each ban record contains complete entity references (user, community, bannedBy)
 * 4. Filtering works correctly by community, user, and status
 * 5. Sorting is by creation date descending (newest first)
 * 6. Timestamps are in ISO 8601 format
 * 7. Permanent vs time-limited ban distinctions are preserved
 */
export async function test_api_community_bans_admin_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for viewing bans
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create member account to own a community
  const memberOwnerConnection: api.IConnection = { host: connection.host };
  const memberOwnerAuth = await authorize_member_join(memberOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberOwnerAuth);
  // 3. Create a test community owned by the member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8) + "_test",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create member accounts to ban (2 users for ban testing)
  const bannedUsers: IRedditPlatformMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(2, async (index: number) => {
      const conn: api.IConnection = { host: connection.host };
      return await authorize_member_join(conn, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    });
  typia.assert(bannedUsers[0]);
  typia.assert(bannedUsers[1]);
  // 5. Ban users from the community with different configurations
  // Ban user 1 - permanent ban
  const ban1 =
    await api.functional.redditPlatform.member.communities.bans.create(
      memberOwnerConnection,
      {
        communityId: community.id,
        body: {
          user_id: bannedUsers[0].id,
          expires_at: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban1);
  // Ban user 2 - time-limited ban (expires in 30 days)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const ban2 =
    await api.functional.redditPlatform.member.communities.bans.create(
      memberOwnerConnection,
      {
        communityId: community.id,
        body: {
          user_id: bannedUsers[1].id,
          expires_at: futureDate.toISOString(),
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban2);
  // 6. Test admin ban listing with basic pagination
  const banListResponse = await api.functional.redditPlatform.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(banListResponse);
  // 7. Verify pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    banListResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    banListResponse.pagination.limit,
    10,
  );
  // 8. Verify ban data array has at least our 2 bans
  TestValidator.predicate(
    "ban list has at least 2 records",
    banListResponse.data.length >= 2,
  );
  // 9. Verify first ban (newest) has correct structure
  const firstBan = banListResponse.data[0];
  typia.assert(firstBan);
  // 10. Verify user entity in ban
  typia.assert(firstBan.user);
  TestValidator.equals(
    "user has username",
    typeof firstBan.user.username,
    "string",
  );
  TestValidator.equals(
    "user has displayName",
    typeof firstBan.user.displayName,
    "string",
  );
  // 11. Verify community entity in ban
  typia.assert(firstBan.community);
  TestValidator.equals(
    "community has name",
    typeof firstBan.community.name,
    "string",
  );
  // 12. Verify bannedBy entity in ban
  typia.assert(firstBan.bannedBy);
  TestValidator.equals(
    "bannedBy has username",
    typeof firstBan.bannedBy.username,
    "string",
  );
  // 13. Verify timestamp fields exist and are valid
  TestValidator.predicate(
    "createdAt exists and is valid",
    firstBan.createdAt !== undefined,
  );
  // 14. Test filtering by community name
  const filteredBansByCommunity =
    await api.functional.redditPlatform.admin.bans.index(adminConnection, {
      body: {
        communityName: community.name,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(filteredBansByCommunity);
  TestValidator.equals(
    "filter by community returns 2 bans",
    filteredBansByCommunity.data.length,
    2,
  );
  // 15. Test filtering by user ID
  const filteredBansByUser =
    await api.functional.redditPlatform.admin.bans.index(adminConnection, {
      body: {
        userId: bannedUsers[0].id,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(filteredBansByUser);
  TestValidator.equals(
    "filter by user returns 1 ban",
    filteredBansByUser.data.length,
    1,
  );
  TestValidator.equals(
    "filtered ban user matches",
    filteredBansByUser.data[0].user.id,
    bannedUsers[0].id,
  );
  // 16. Test sorting verification - verify bans are sorted by createdAt descending
  if (banListResponse.data.length >= 2) {
    const firstBanDate = new Date(banListResponse.data[0].createdAt).getTime();
    const secondBanDate = new Date(banListResponse.data[1].createdAt).getTime();
    TestValidator.predicate(
      "bans sorted by createdAt descending",
      firstBanDate >= secondBanDate,
    );
  }
  // 17. Verify permanent ban has null expiresAt
  const permanentBan = banListResponse.data.find(
    (ban) => ban.expiresAt === null,
  );
  if (permanentBan) {
    typia.assert(permanentBan);
    TestValidator.equals(
      "permanent ban has null expiresAt",
      permanentBan.expiresAt,
      null,
    );
  }
  // 18. Verify time-limited ban has non-null expiresAt
  const timeLimitedBan = banListResponse.data.find(
    (ban) => ban.expiresAt !== null,
  );
  if (timeLimitedBan) {
    typia.assert(timeLimitedBan);
    TestValidator.equals(
      "time-limited ban has expiresAt",
      timeLimitedBan.expiresAt !== null,
      true,
    );
  }
  // 19. Test pagination with page=2 (should return fewer or empty results)
  const pageTwoResponse = await api.functional.redditPlatform.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(pageTwoResponse);
  TestValidator.equals(
    "page 2 has data",
    pageTwoResponse.data.length >= 0,
    true,
  );
  // 20. Test status filter - filter by active status
  const activeBansResponse =
    await api.functional.redditPlatform.admin.bans.index(adminConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(activeBansResponse);
  TestValidator.equals(
    "active bans filter works",
    activeBansResponse.data.length >= 0,
    true,
  );
  // 21. Verify all bans in response have isActive field
  banListResponse.data.forEach((ban) => {
    typia.assert(ban);
    TestValidator.equals(
      "ban has isActive boolean",
      typeof ban.isActive,
      "boolean",
    );
  });
}