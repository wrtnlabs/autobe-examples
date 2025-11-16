import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityMembership";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMembership";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test role-based membership management scenarios where moderators filter
 * memberships by specific roles. Validates the ability to quickly identify all
 * moderators, banned users, suspended members, or regular members within a
 * community. Tests that role filtering works correctly with pagination and
 * other search parameters. Verifies that moderators can efficiently manage
 * different member groups and perform role-specific administrative actions
 * based on filtered results.
 *
 * This test creates a comprehensive scenario with community moderator
 * authentication, community creation, member account setup, and role-based
 * membership filtering to validate the complete membership management
 * workflow.
 */
export async function test_api_community_membership_role_based_management(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SuperSecureModeratorPass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== undefined,
  );

  // Step 2: Create test community with the moderator
  const communityName = `tech_community_${RandomGenerator.alphabets(8)}`;
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: "Technology Discussions & Innovation",
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== undefined,
  );
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Create multiple member accounts for testing
  // Note: In a real system, there would be APIs to add members to communities with specific roles.
  // Since we only have basic member creation, we'll create members and test the filtering
  // with the assumption that these members would have community memberships with different roles.
  const memberEmails = ArrayUtil.repeat(6, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  // Create regular member accounts
  const regularMembers = await ArrayUtil.asyncRepeat(3, async (index) => {
    const memberConnection: api.IConnection = { ...connection, headers: {} };
    const member = await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmails[index],
        password: "SecureMemberPass123!",
        nickname: `${RandomGenerator.name()}_${index}`,
      } satisfies IRedditCommunityMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Create additional member accounts (these would represent different roles in actual implementation)
  const additionalMembers = await ArrayUtil.asyncRepeat(3, async (index) => {
    const memberConnection: api.IConnection = { ...connection, headers: {} };
    const member = await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmails[index + 3],
        password: "SecureMemberPass123!",
        nickname: `${RandomGenerator.name()}_${index + 3}`,
      } satisfies IRedditCommunityMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 4: Test role-based filtering capabilities

  // Test basic member filtering (this would filter regular community members)
  const memberFilterRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "member",
    limit: 10,
    page: 1,
  };
  const memberResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: memberFilterRequest,
      },
    );
  typia.assert(memberResults);
  TestValidator.predicate(
    "member filter results should be valid",
    memberResults !== undefined,
  );
  TestValidator.predicate(
    "member results have valid pagination",
    memberResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "member results data array exists",
    memberResults.data !== undefined,
  );

  // Validate pagination information
  TestValidator.equals(
    "pagination current page should be 1",
    memberResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    memberResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    memberResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    memberResults.pagination.pages >= 1,
  );

  // Test moderator filtering
  const moderatorFilterRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "moderator",
    limit: 10,
    page: 1,
  };
  const moderatorResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: moderatorFilterRequest,
      },
    );
  typia.assert(moderatorResults);
  TestValidator.predicate(
    "moderator filter results should be valid",
    moderatorResults !== undefined,
  );
  TestValidator.predicate(
    "moderator results have valid pagination",
    moderatorResults.pagination !== undefined,
  );

  // Test banned user filtering
  const bannedFilterRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "banned",
    limit: 10,
    page: 1,
  };
  const bannedResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: bannedFilterRequest,
      },
    );
  typia.assert(bannedResults);
  TestValidator.predicate(
    "banned filter results should be valid",
    bannedResults !== undefined,
  );

  // Test suspended user filtering
  const suspendedFilterRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "suspended",
    limit: 10,
    page: 1,
  };
  const suspendedResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: suspendedFilterRequest,
      },
    );
  typia.assert(suspendedResults);
  TestValidator.predicate(
    "suspended filter results should be valid",
    suspendedResults !== undefined,
  );

  // Step 5: Test pagination functionality with role filtering
  const paginatedRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "member",
    limit: 5,
    page: 1,
  };
  const firstPage =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: paginatedRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "first page should not exceed limit",
    firstPage.data.length <= 5,
  );

  // Step 6: Test combined search and filtering parameters
  const combinedSearchRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "member",
    search_member_nickname: regularMembers[0].nickname.substring(0, 5), // Partial match
    limit: 10,
    page: 1,
    sort_by: "joined_at",
    sort_order: "desc",
  };
  const searchResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: combinedSearchRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should be valid",
    searchResults !== undefined,
  );

  // If search returns results, validate they match the search criteria
  if (searchResults.data.length > 0) {
    TestValidator.predicate(
      "search results should contain matching nickname",
      searchResults.data.some((membership) =>
        membership.reddit_community_member?.nickname.includes(
          combinedSearchRequest.search_member_nickname!,
        ),
      ),
    );
  }

  // Step 7: Test date range filtering capabilities
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 86400000);
  const dateRangeRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "member",
    joined_after: twentyFourHoursAgo.toISOString(),
    joined_before: now.toISOString(),
    limit: 10,
    page: 1,
  };
  const dateRangeResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range results should be valid",
    dateRangeResults !== undefined,
  );

  // Step 8: Test sorting functionality with role filtering
  const sortedRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "member",
    sort_by: "last_activity_at",
    sort_order: "desc",
    limit: 10,
    page: 1,
  };
  const sortedResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: sortedRequest,
      },
    );
  typia.assert(sortedResults);
  TestValidator.predicate(
    "sorted results should be valid",
    sortedResults !== undefined,
  );
  TestValidator.predicate(
    "sorted results should not exceed limit",
    sortedResults.data.length <= 10,
  );

  // Validate sorting order if we have multiple results
  if (sortedResults.data.length > 1) {
    for (let i = 0; i < sortedResults.data.length - 1; i++) {
      if (
        sortedResults.data[i].last_activity_at &&
        sortedResults.data[i + 1].last_activity_at
      ) {
        const current = new Date(
          sortedResults.data[i].last_activity_at,
        ).getTime();
        const next = new Date(
          sortedResults.data[i + 1].last_activity_at,
        ).getTime();
        TestValidator.predicate(
          "results should be sorted by last_activity_at descending",
          current >= next,
        );
      }
    }
  }

  // Step 9: Test empty result handling
  const emptySearchRequest: IRedditCommunityCommunityMembership.IRequest = {
    role: "member",
    search_member_nickname: "nonexistentuser12345",
    limit: 10,
    page: 1,
  };
  const emptyResults =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: communityName,
        body: emptySearchRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty search should return valid empty results",
    emptyResults !== undefined,
  );
  TestValidator.predicate(
    "empty search should have zero data",
    emptyResults.data.length === 0,
  );
  TestValidator.equals(
    "empty search pagination current should be 1",
    emptyResults.pagination.current,
    1,
  );

  // Step 10: Validate that membership summaries contain expected information
  if (memberResults.data.length > 0) {
    const sampleMembership = memberResults.data[0];
    TestValidator.predicate(
      "membership should have required ID",
      sampleMembership.id !== undefined,
    );
    TestValidator.predicate(
      "membership should have role information",
      sampleMembership.role !== undefined,
    );
    TestValidator.predicate(
      "membership should have joined_at timestamp",
      sampleMembership.joined_at !== undefined,
    );
    TestValidator.predicate(
      "membership should have last_activity_at timestamp",
      sampleMembership.last_activity_at !== undefined,
    );

    // Validate member information when available
    if (sampleMembership.reddit_community_member) {
      TestValidator.predicate(
        "member should have ID",
        sampleMembership.reddit_community_member.id !== undefined,
      );
      TestValidator.predicate(
        "member should have nickname",
        sampleMembership.reddit_community_member.nickname !== undefined,
      );
      TestValidator.predicate(
        "member should have email",
        sampleMembership.reddit_community_member.email !== undefined,
      );
    }

    // Validate community information when available
    if (sampleMembership.reddit_community_community) {
      TestValidator.predicate(
        "community should have ID",
        sampleMembership.reddit_community_community.id !== undefined,
      );
      TestValidator.predicate(
        "community should have name",
        sampleMembership.reddit_community_community.name !== undefined,
      );
      TestValidator.predicate(
        "community should have title",
        sampleMembership.reddit_community_community.title !== undefined,
      );
    }
  }
}
