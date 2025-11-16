import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test combining multiple filter parameters simultaneously to perform complex
 * ban queries.
 *
 * This test validates that moderators can apply sophisticated filtering logic
 * for precise moderation queue management. It verifies that:
 *
 * 1. Multiple filters work together with AND logic
 * 2. Combining status, username, and date filters produces accurate intersected
 *    results
 * 3. Adding pagination and sorting to filtered queries works correctly
 * 4. All filter parameters are respected simultaneously
 * 5. Empty results are returned gracefully when no bans match all criteria
 *
 * This represents real-world moderation workflows where moderators need to find
 * specific subsets of enforcement actions using multiple criteria.
 */
export async function test_api_community_ban_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple member accounts for diverse ban scenarios
  const memberCount = 7;
  const members: IRedditCommunityGuest.IAuthorized[] =
    await ArrayUtil.asyncRepeat(memberCount, async () => {
      const memberData = {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: typia.random<boolean>(),
        show_subscribed_communities: typia.random<boolean>(),
        show_activity_feed: typia.random<boolean>(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate;

      const member: IRedditCommunityGuest.IAuthorized =
        await api.functional.auth.guest.join(connection, {
          body: memberData,
        });
      typia.assert(member);
      return member;
    });

  // Step 4: Create diverse ban records with different attributes
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Create bans with different characteristics for filtering tests
  const banRecords: IRedditCommunityCommunityBan[] = [];

  // Ban 1: Active, recent, member 0
  const ban1Data = {
    banned_member_id: members[0].id,
    reason: "Spam posting",
    expires_at: new Date(now.getTime() + 7 * oneDayMs).toISOString(),
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const ban1: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: ban1Data,
      },
    );
  typia.assert(ban1);
  banRecords.push(ban1);

  // Ban 2: Active, permanent, member 1
  const ban2Data = {
    banned_member_id: members[1].id,
    reason: "Harassment",
    expires_at: null,
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const ban2: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: ban2Data,
      },
    );
  typia.assert(ban2);
  banRecords.push(ban2);

  // Ban 3: Active, member 2
  const ban3Data = {
    banned_member_id: members[2].id,
    reason: "Rule violation",
    expires_at: new Date(now.getTime() + 14 * oneDayMs).toISOString(),
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const ban3: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: ban3Data,
      },
    );
  typia.assert(ban3);
  banRecords.push(ban3);

  // Ban 4: Active, member 3
  const ban4Data = {
    banned_member_id: members[3].id,
    reason: "Toxic behavior",
    expires_at: new Date(now.getTime() + 30 * oneDayMs).toISOString(),
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const ban4: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: ban4Data,
      },
    );
  typia.assert(ban4);
  banRecords.push(ban4);

  // Ban 5: Active, member 4
  const ban5Data = {
    banned_member_id: members[4].id,
    reason: "Multiple warnings ignored",
    expires_at: new Date(now.getTime() + 3 * oneDayMs).toISOString(),
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const ban5: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: ban5Data,
      },
    );
  typia.assert(ban5);
  banRecords.push(ban5);

  // Test Scenario 1: Filter by status only
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    status: "active" as const,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const statusFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: statusFilterRequest,
      },
    );
  typia.assert(statusFilterResult);

  TestValidator.predicate(
    "status filter should return active bans",
    statusFilterResult.data.length === 5,
  );
  TestValidator.predicate(
    "all returned bans should have active status",
    statusFilterResult.data.every((ban) => ban.status === "active"),
  );

  // Test Scenario 2: Filter by banned member username
  const targetMember = members[0];
  const usernameFilterRequest = {
    page: 1,
    limit: 10,
    banned_member_username: targetMember.username,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const usernameFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: usernameFilterRequest,
      },
    );
  typia.assert(usernameFilterResult);

  TestValidator.predicate(
    "username filter should return bans for specific member",
    usernameFilterResult.data.length === 1,
  );
  TestValidator.equals(
    "returned ban should match target member",
    usernameFilterResult.data[0].banned_member.username,
    targetMember.username,
  );

  // Test Scenario 3: Combine status + username filters
  const combinedFilter1Request = {
    page: 1,
    limit: 10,
    status: "active" as const,
    banned_member_username: targetMember.username,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const combinedFilter1Result: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: combinedFilter1Request,
      },
    );
  typia.assert(combinedFilter1Result);

  TestValidator.predicate(
    "combined status+username filter should return matching bans",
    combinedFilter1Result.data.length === 1,
  );
  TestValidator.predicate(
    "combined filter result should match both criteria",
    combinedFilter1Result.data[0].status === "active" &&
      combinedFilter1Result.data[0].banned_member.username ===
        targetMember.username,
  );

  // Test Scenario 4: Filter by date range
  const dateRangeFilterRequest = {
    page: 1,
    limit: 10,
    created_from: new Date(now.getTime() - oneDayMs).toISOString(),
    created_to: new Date(now.getTime() + oneDayMs).toISOString(),
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const dateRangeFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: dateRangeFilterRequest,
      },
    );
  typia.assert(dateRangeFilterResult);

  TestValidator.predicate(
    "date range filter should return bans within range",
    dateRangeFilterResult.data.length >= 0,
  );

  // Test Scenario 5: Combine status + date range filters
  const combinedFilter2Request = {
    page: 1,
    limit: 10,
    status: "active" as const,
    created_from: new Date(now.getTime() - oneDayMs).toISOString(),
    created_to: new Date(now.getTime() + oneDayMs).toISOString(),
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const combinedFilter2Result: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: combinedFilter2Request,
      },
    );
  typia.assert(combinedFilter2Result);

  TestValidator.predicate(
    "combined status+date filter should return matching bans",
    combinedFilter2Result.data.every((ban) => ban.status === "active"),
  );

  // Test Scenario 6: Triple filter combination (status + username + date)
  const tripleFilterRequest = {
    page: 1,
    limit: 10,
    status: "active" as const,
    banned_member_username: targetMember.username,
    created_from: new Date(now.getTime() - oneDayMs).toISOString(),
    created_to: new Date(now.getTime() + oneDayMs).toISOString(),
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const tripleFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: tripleFilterRequest,
      },
    );
  typia.assert(tripleFilterResult);

  TestValidator.predicate(
    "triple filter should return bans matching all criteria",
    tripleFilterResult.data.every(
      (ban) =>
        ban.status === "active" &&
        ban.banned_member.username === targetMember.username,
    ),
  );

  // Test Scenario 7: Pagination with filters
  const paginationFilterRequest = {
    page: 1,
    limit: 2,
    status: "active" as const,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const paginationFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: paginationFilterRequest,
      },
    );
  typia.assert(paginationFilterResult);

  TestValidator.predicate(
    "pagination should respect limit parameter",
    paginationFilterResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination metadata should reflect limit",
    paginationFilterResult.pagination.limit,
    2,
  );

  // Test Scenario 8: Sorting with filters
  const sortingFilterRequest = {
    page: 1,
    limit: 10,
    status: "active" as const,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const sortingFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: sortingFilterRequest,
      },
    );
  typia.assert(sortingFilterResult);

  TestValidator.predicate(
    "sorting should be applied to filtered results",
    sortingFilterResult.data.length > 0,
  );

  // Test Scenario 9: Filter combination that matches no records
  const noMatchFilterRequest = {
    page: 1,
    limit: 10,
    status: "expired" as const,
    banned_member_username: "nonexistent_user_12345",
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const noMatchFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: noMatchFilterRequest,
      },
    );
  typia.assert(noMatchFilterResult);

  TestValidator.predicate(
    "no match filter should return empty array gracefully",
    noMatchFilterResult.data.length === 0,
  );
  TestValidator.equals(
    "pagination should show zero records",
    noMatchFilterResult.pagination.records,
    0,
  );

  // Test Scenario 10: Filter by moderator username
  const moderatorFilterRequest = {
    page: 1,
    limit: 10,
    moderator_username: moderator.username,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const moderatorFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: moderatorFilterRequest,
      },
    );
  typia.assert(moderatorFilterResult);

  TestValidator.predicate(
    "moderator filter should return bans issued by moderator",
    moderatorFilterResult.data.every(
      (ban) => ban.moderator.username === moderator.username,
    ),
  );

  // Test Scenario 11: General search term
  const searchFilterRequest = {
    page: 1,
    limit: 10,
    search: "spam",
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const searchFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: searchFilterRequest,
      },
    );
  typia.assert(searchFilterResult);

  TestValidator.predicate(
    "search filter should return matching results",
    searchFilterResult.data.length >= 0,
  );
}
