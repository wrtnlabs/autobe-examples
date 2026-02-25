import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test moderator listing pagination and search functionality when a community has multiple moderators.
 *
 * This scenario validates that:
 * 1. Moderators are sorted by role (owners first) then by appointment date (ascending)
 * 2. Multiple moderators display correctly with their roles ('owner' vs 'moderator')
 * 3. Appointed moderators show the appointer member information
 * 4. Pagination parameters (page, limit) correctly control the result set
 * 5. Search filter correctly filters moderators by username with case-insensitive partial matching
 * 6. When searching, only matching moderators are returned in the paginated results
 * 7. The total record count reflects filtered results when search is applied
 */
export async function test_api_community_moderator_list_pagination_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(owner);
  // 2. Create a community (owner becomes the owner moderator)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create first moderator member account
  const mod1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_member_join(mod1Connection, {
    body: {
      username: `moderator_alice_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(moderator1);
  // 4. Owner appoints first member as moderator
  const mod1Record =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator1.username },
      },
    );
  typia.assert(mod1Record);
  // 5. Create second moderator member account for search testing
  const mod2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_member_join(mod2Connection, {
    body: {
      username: `moderator_bob_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(moderator2);
  // 6. Owner appoints second member as moderator
  const mod2Record =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator2.username },
      },
    );
  typia.assert(mod2Record);
  // ========================================
  // TEST 1: List all moderators (default pagination)
  // ========================================
  const allModerators =
    await api.functional.community.communities.moderators.index(connection, {
      communityName: community.name,
      body: {},
    });
  typia.assert(allModerators);
  // Validate: Should have 3 moderators (1 owner + 2 appointed)
  TestValidator.equals(
    "total moderator count",
    allModerators.pagination.records,
    3,
  );
  TestValidator.equals(
    "returned moderator count",
    allModerators.data.length,
    3,
  );
  // Validate: Owner should be first (sorted by role: owners first)
  TestValidator.equals(
    "first moderator is owner",
    allModerators.data[0].role,
    "owner",
  );
  TestValidator.equals(
    "owner username matches",
    allModerators.data[0].member.username,
    owner.username,
  );
  TestValidator.equals(
    "owner has no appointer",
    allModerators.data[0].appointer,
    null,
  );
  // Validate: Appointed moderators come after owner
  TestValidator.predicate(
    "appointed moderators are after owner",
    allModerators.data.slice(1).every((m) => m.role === "moderator"),
  );
  // Validate: Appointed moderators have appointer info
  const appointedMods = allModerators.data.filter(
    (m) => m.role === "moderator",
  );
  TestValidator.predicate(
    "appointed moderators have appointer",
    appointedMods.every((m) => m.appointer !== null),
  );
  // ========================================
  // TEST 2: Pagination with limit parameter
  // ========================================
  const page1 = await api.functional.community.communities.moderators.index(
    connection,
    {
      communityName: community.name,
      body: { limit: 2, page: 1 },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 records", page1.pagination.records, 3);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1.data.length, 2);
  // First item should be owner
  TestValidator.equals("page 1 first is owner", page1.data[0].role, "owner");
  // Page 2
  const page2 = await api.functional.community.communities.moderators.index(
    connection,
    {
      communityName: community.name,
      body: { limit: 2, page: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2.data.length, 1);
  TestValidator.equals(
    "page 2 first is moderator",
    page2.data[0].role,
    "moderator",
  );
  // ========================================
  // TEST 3: Search by partial username (case-insensitive)
  // ========================================
  // Search for "alice" - should match moderator1's username
  const searchAlice =
    await api.functional.community.communities.moderators.index(connection, {
      communityName: community.name,
      body: { search: "alice" },
    });
  typia.assert(searchAlice);
  TestValidator.equals(
    "search alice results count",
    searchAlice.data.length,
    1,
  );
  TestValidator.predicate(
    "search alice matches moderator1",
    searchAlice.data[0].member.username.toLowerCase().includes("alice"),
  );
  // Search for "BOB" (uppercase) - should match moderator2's username (case-insensitive)
  const searchBob = await api.functional.community.communities.moderators.index(
    connection,
    {
      communityName: community.name,
      body: { search: "BOB" },
    },
  );
  typia.assert(searchBob);
  TestValidator.equals("search bob results count", searchBob.data.length, 1);
  TestValidator.predicate(
    "search bob matches moderator2",
    searchBob.data[0].member.username.toLowerCase().includes("bob"),
  );
  // ========================================
  // TEST 4: Search with pagination combined
  // ========================================
  // Create more moderators for combined test
  const mod3Connection: api.IConnection = { host: connection.host };
  const moderator3 = await authorize_member_join(mod3Connection, {
    body: {
      username: `moderator_alice_extra_${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(moderator3);
  await generate_random_community_member_communities_moderators_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { member_username: moderator3.username },
    },
  );
  // Search for "alice" with limit - should return 2 results matching "alice"
  const searchAlicePaginated =
    await api.functional.community.communities.moderators.index(connection, {
      communityName: community.name,
      body: { search: "alice", limit: 1, page: 1 },
    });
  typia.assert(searchAlicePaginated);
  TestValidator.equals(
    "search alice total records",
    searchAlicePaginated.pagination.records,
    2,
  );
  TestValidator.equals(
    "search alice page limit",
    searchAlicePaginated.pagination.limit,
    1,
  );
  TestValidator.equals(
    "search alice page 1 data length",
    searchAlicePaginated.data.length,
    1,
  );
  TestValidator.equals(
    "search alice total pages",
    searchAlicePaginated.pagination.pages,
    2,
  );
  // Page 2 of search results
  const searchAlicePage2 =
    await api.functional.community.communities.moderators.index(connection, {
      communityName: community.name,
      body: { search: "alice", limit: 1, page: 2 },
    });
  typia.assert(searchAlicePage2);
  TestValidator.equals(
    "search alice page 2 current",
    searchAlicePage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "search alice page 2 data length",
    searchAlicePage2.data.length,
    1,
  );
  // ========================================
  // TEST 5: Search with no matches
  // ========================================
  const searchNoMatch =
    await api.functional.community.communities.moderators.index(connection, {
      communityName: community.name,
      body: { search: "nonexistentuser" },
    });
  typia.assert(searchNoMatch);
  TestValidator.equals(
    "search no match results count",
    searchNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "search no match total records",
    searchNoMatch.pagination.records,
    0,
  );
}
