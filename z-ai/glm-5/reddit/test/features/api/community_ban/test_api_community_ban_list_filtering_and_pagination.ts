import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_ban_list_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test the filtering and pagination capabilities of the ban list endpoint.
  // The owner creates multiple bans including permanent bans and expired temporary bans.
  // Verify filtering by status, username partial match, date range, pagination, and sorting.
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community as owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create first member to be permanently banned
  const bannedMember1Connection: api.IConnection = { host: connection.host };
  const bannedMember1 = await authorize_member_join(
    bannedMember1Connection,
    {},
  );
  typia.assert(bannedMember1);
  // 4. Create second member to be temporarily banned (already expired)
  const bannedMember2Connection: api.IConnection = { host: connection.host };
  const bannedMember2 = await authorize_member_join(
    bannedMember2Connection,
    {},
  );
  typia.assert(bannedMember2);
  // 5. Create third member for additional testing
  const bannedMember3Connection: api.IConnection = { host: connection.host };
  const bannedMember3 = await authorize_member_join(
    bannedMember3Connection,
    {},
  );
  typia.assert(bannedMember3);
  // 6. Create permanent ban for member 1
  const permanentBan =
    await api.functional.community.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          username: bannedMember1.username,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  // 7. Create expired temporary ban for member 2 (expired_at in the past)
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
  const expiredBan =
    await api.functional.community.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          username: bannedMember2.username,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expired_at: pastDate.toISOString(),
        } satisfies ICommunityBan.ICreate,
      },
    );
  typia.assert(expiredBan);
  // 8. Create another permanent ban for member 3
  const permanentBan2 =
    await api.functional.community.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          username: bannedMember3.username,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan2);
  // TEST 1: Filter by status = "active" (should return permanent bans only)
  const activeBans =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "active" } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(activeBans);
  TestValidator.predicate(
    "active bans should include permanent bans",
    activeBans.data.some((ban) => ban.id === permanentBan.id),
  );
  TestValidator.predicate(
    "active bans should include second permanent ban",
    activeBans.data.some((ban) => ban.id === permanentBan2.id),
  );
  TestValidator.predicate(
    "active bans should not include expired ban",
    !activeBans.data.some((ban) => ban.id === expiredBan.id),
  );
  // TEST 2: Filter by status = "expired" (should return expired temporary bans only)
  const expiredBans =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "expired" } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(expiredBans);
  TestValidator.predicate(
    "expired bans should include expired ban",
    expiredBans.data.some((ban) => ban.id === expiredBan.id),
  );
  TestValidator.predicate(
    "expired bans should not include permanent bans",
    !expiredBans.data.some(
      (ban) => ban.id === permanentBan.id || ban.id === permanentBan2.id,
    ),
  );
  // TEST 3: Filter by status = "all" (should return all bans)
  const allBans = await api.functional.community.member.communities.bans.index(
    ownerConnection,
    {
      communityName: community.name,
      body: { status: "all" } satisfies ICommunityBan.IRequest,
    },
  );
  typia.assert(allBans);
  TestValidator.equals("all bans count", allBans.data.length, 3);
  // TEST 4: Filter by username partial match (case-insensitive)
  const partialUsername = bannedMember1.username.substring(0, 5);
  const usernameFilterBans =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { username: partialUsername } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(usernameFilterBans);
  TestValidator.predicate(
    "username filter should find matching ban",
    usernameFilterBans.data.some(
      (ban) => ban.member.username === bannedMember1.username,
    ),
  );
  // TEST 5: Filter by username with different case (case-insensitive)
  const uppercaseUsername = bannedMember1.username.toUpperCase();
  const caseInsensitiveBans =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { username: uppercaseUsername } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(caseInsensitiveBans);
  TestValidator.predicate(
    "case-insensitive username filter should work",
    caseInsensitiveBans.data.length > 0,
  );
  // TEST 6: Pagination - page 1 with limit 1
  const page1 = await api.functional.community.member.communities.bans.index(
    ownerConnection,
    {
      communityName: community.name,
      body: { page: 1, limit: 1 } satisfies ICommunityBan.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 should have 1 item", page1.data.length, 1);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 1);
  // TEST 7: Pagination - page 2 with limit 1
  const page2 = await api.functional.community.member.communities.bans.index(
    ownerConnection,
    {
      communityName: community.name,
      body: { page: 2, limit: 1 } satisfies ICommunityBan.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 should have 1 item", page2.data.length, 1);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  // TEST 8: Verify page 1 and page 2 have different bans
  TestValidator.notEquals(
    "page 1 and page 2 should have different bans",
    page1.data[0].id,
    page2.data[0].id,
  );
  // TEST 9: Sort by created_at ascending
  const sortedAsc =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(sortedAsc);
  // TEST 10: Sort by created_at descending
  const sortedDesc =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(sortedDesc);
  // Verify sorting order is different
  if (sortedAsc.data.length >= 2 && sortedDesc.data.length >= 2) {
    TestValidator.equals(
      "descending first should be ascending last",
      sortedAsc.data[sortedAsc.data.length - 1].id,
      sortedDesc.data[0].id,
    );
  }
  // TEST 11: Sort by expired_at
  const sortedByExpiredAt =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "expired_at",
          order: "asc",
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(sortedByExpiredAt);
  // TEST 12: Date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          created_from: oneDayAgo.toISOString(),
          created_to: now.toISOString(),
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date range filter should return results",
    dateFiltered.data.length > 0,
  );
  // TEST 13: Combined filters - status and pagination
  const combinedFilter =
    await api.functional.community.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          status: "active",
          page: 1,
          limit: 2,
        } satisfies ICommunityBan.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter should return active bans",
    combinedFilter.data.every(
      (ban) => ban.expiredAt === null || new Date(ban.expiredAt) > new Date(),
    ),
  );
}
