import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_member_bans_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community as owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create another member to ban
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Create ban record using the owner's connection
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: bannedMemberAuth.id,
          expires_at: null, // permanent ban
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Test ban list retrieval with basic filters
  const bansResponse = await api.functional.redditPlatform.member.bans.index(
    ownerConnection,
    {
      body: {
        communityName: community.name,
        status: "active",
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IRedditPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(bansResponse);
  // 6. Verify response structure
  TestValidator.equals("has data array", bansResponse.data.length >= 1, true);
  TestValidator.equals(
    "pagination current",
    bansResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", bansResponse.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    bansResponse.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages", bansResponse.pagination.pages, 1);
  // 7. Verify first ban record structure
  const firstBan = bansResponse.data[0];
  typia.assert(firstBan);
  TestValidator.equals("ban id matches", firstBan.id, ban.id);
  TestValidator.equals(
    "user username matches",
    firstBan.user.username,
    bannedMemberAuth.username,
  );
  TestValidator.equals(
    "user display_name matches",
    firstBan.user.displayName,
    bannedMemberAuth.displayName,
  );
  TestValidator.equals(
    "community name matches",
    firstBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "bannedBy username matches",
    firstBan.bannedBy.username,
    ownerAuth.username,
  );
  TestValidator.equals(
    "bannedBy display_name matches",
    firstBan.bannedBy.displayName,
    ownerAuth.displayName,
  );
  TestValidator.equals(
    "isActive is true for permanent active ban",
    firstBan.isActive,
    true,
  );
  TestValidator.equals(
    "expiresAt is null for permanent ban",
    firstBan.expiresAt,
    null,
  );
  TestValidator.equals(
    "deletedAt is null for active ban",
    firstBan.deletedAt,
    null,
  );
  // 8. Test pagination with different limit
  const paginatedResponse =
    await api.functional.redditPlatform.member.bans.index(ownerConnection, {
      body: {
        limit: 5,
        page: 1,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit changed",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination records unchanged",
    paginatedResponse.pagination.records,
    1,
  );
  // 9. Test with date range filter
  const bansWithDateRange =
    await api.functional.redditPlatform.member.bans.index(ownerConnection, {
      body: {
        communityName: community.name,
        startDate: ban.created_at,
        endDate: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityBan.IRequest,
    });
  typia.assert(bansWithDateRange);
  TestValidator.equals(
    "date range filter includes ban",
    bansWithDateRange.data.some((b) => b.id === ban.id),
    true,
  );
}
