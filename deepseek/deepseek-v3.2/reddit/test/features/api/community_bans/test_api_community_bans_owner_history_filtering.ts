import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test community owner viewing comprehensive ban history with date range filtering.
 */
export async function test_api_community_bans_owner_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member who will be community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community owned by the member
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Note: Since we don't have a ban creation API, we cannot actually create bans.
  // The scenario assumes ban records exist (they would be created by moderators via other endpoints).
  // We'll test that the owner can view bans by calling the index endpoint with various filters.
  // However, the response will likely be empty or contain seed data.
  // We'll test the filtering functionality with the owner's authorization.
  // 3. Test ban list with various filters
  // Since we cannot create actual bans, we'll test the endpoint responds correctly
  // with different filter combinations that an owner would use.
  // 3.1 Test with no filters (all bans)
  const allBans = await api.functional.communityPlatform.member.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(allBans);
  // 3.2 Test with active filter
  const activeBans = await api.functional.communityPlatform.member.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        active: true,
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(activeBans);
  // 3.3 Test with date range filters (simulated dates)
  // Use past dates to ensure we're not filtering out all data
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const recentDate = new Date(
    Date.now() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day ago
  const dateFilteredBans =
    await api.functional.communityPlatform.member.bans.index(ownerConnection, {
      communityId: community.id,
      body: {
        bannedAtFrom: pastDate,
        bannedAtTo: recentDate,
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(dateFilteredBans);
  // 3.4 Test with null expiration filter (permanent bans)
  const permanentBans =
    await api.functional.communityPlatform.member.bans.index(ownerConnection, {
      communityId: community.id,
      body: {
        expiresAtFrom: null,
        expiresAtTo: null,
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(permanentBans);
  // 3.5 Test with null unban filter (active bans - not lifted)
  const activeNotLiftedBans =
    await api.functional.communityPlatform.member.bans.index(ownerConnection, {
      communityId: community.id,
      body: {
        unbannedAtFrom: null,
        unbannedAtTo: null,
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(activeNotLiftedBans);
  // 4. Test username search (partial match)
  const searchBans = await api.functional.communityPlatform.member.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        username: RandomGenerator.alphabets(3), // Random short search
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(searchBans);
  // 5. Validate pagination business logic (not type validation)
  TestValidator.predicate(
    "current page is at least 1",
    allBans.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within valid range",
    allBans.pagination.limit >= 1 && allBans.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allBans.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allBans.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length matches pagination records",
    allBans.data.length <= allBans.pagination.records,
  );
  // 6. Business logic validation: if we have data, test sorting
  if (allBans.data.length > 1) {
    // Verify sorting by banned_at desc
    for (let i = 1; i < allBans.data.length; i++) {
      const current = new Date(allBans.data[i - 1].banned_at);
      const previous = new Date(allBans.data[i].banned_at);
      TestValidator.predicate(
        "sorted descending by banned_at",
        current >= previous,
      );
    }
  }
}