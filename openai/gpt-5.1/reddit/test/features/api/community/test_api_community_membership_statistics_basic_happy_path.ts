import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityMembershipStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipStatistics";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembershipStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembershipStatistics";

/**
 * Happy-path statistics aggregation for community memberships.
 *
 * This test walks through a realistic multi-actor flow to verify that PATCH
 * /communityPlatform/statistics/communities/membership returns a consistent
 * per-community membership statistics summary when there is a small, valid set
 * of active memberships.
 *
 * Business steps:
 *
 * 1. Register a platform admin and implicitly authenticate.
 * 2. As platform admin, create a `public` community visibility level.
 * 3. Register a first member user and implicitly authenticate.
 * 4. As that member user, create a new community that uses the `public` visibility
 *    level code.
 * 5. Register a community moderator and implicitly authenticate.
 * 6. Register one or more additional member users (who will become members of this
 *    community) and collect their IDs.
 * 7. As a member user, create a membership request for the community to simulate
 *    the onboarding flow (not used for statistics directly).
 * 8. As the community moderator, create active memberships for a subset of the
 *    registered member users in this community.
 * 9. Call the statistics endpoint with filters that include only the created
 *    community identifier and a joinedFrom/joinedTo range covering the join
 *    timestamps.
 * 10. Validate that the statistics response includes exactly one row for the newly
 *     created community, that total_members_count matches the number of active
 *     memberships created in this test, and that all derived counters are
 *     structurally valid and non-negative.
 */
export async function test_api_community_membership_statistics_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and becomes authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a `public` visibility level
  const visibilityCode = "public-" + RandomGenerator.alphabets(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. First member user joins and becomes authenticated
  const memberUser1JoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@members.example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: undefined,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUser1JoinBody,
    });
  typia.assert(memberUser1);

  // 4. As memberUser1, create a community that uses the `public` visibility
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Community moderator joins and becomes authenticated
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderators.example.com`,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    ip: undefined,
    href: "https://mod.example.com/signup",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(communityModerator);

  // 6. Register additional member users to become community members
  const memberUserIds: (string & tags.Format<"uuid">)[] = [];
  const additionalMembersCount = 3;

  for (let i = 0; i < additionalMembersCount; i += 1) {
    const joinBody = {
      username: RandomGenerator.alphabets(10),
      email: `${RandomGenerator.alphabets(8)}${i}@members.example.com`,
      password: RandomGenerator.alphaNumeric(10),
      ip: undefined,
      href: "https://app.example.com/signup",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest;

    const member: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: joinBody,
      });
    typia.assert(member);
    memberUserIds.push(member.id);
  }

  // 7. As a member user, create a membership request for the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 8. As the community moderator, create active memberships for all additional member users
  const activeMemberships: ICommunityPlatformCommunityMembership[] = [];

  for (const memberId of memberUserIds) {
    const membershipCreateBody = {
      memberuser_id: memberId,
      is_active: true,
    } satisfies ICommunityPlatformCommunityMembership.ICreate;

    const membership: ICommunityPlatformCommunityMembership =
      await api.functional.communityPlatform.communityModerator.communities.memberships.create(
        connection,
        {
          communityIdentifier,
          body: membershipCreateBody,
        },
      );
    typia.assert(membership);
    activeMemberships.push(membership);
  }

  const expectedActiveCount = activeMemberships.length;

  // Compute a joinedAt range that comfortably covers all created memberships
  const joinedTimestamps = activeMemberships.map((m) => m.joined_at);
  joinedTimestamps.sort();
  const joinedFrom = joinedTimestamps[0];
  const joinedTo = joinedTimestamps[joinedTimestamps.length - 1];

  // 9. Call statistics endpoint filtered by the created community
  const statsRequestBody = {
    communityIdentifiers: [community.identifier],
    minActiveMembers: undefined,
    maxActiveMembers: undefined,
    joinedFrom,
    joinedTo,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<0>,
    orderBy: "total_members_count",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityMembershipStatistics.IRequest;

  const statsPage: IPageICommunityPlatformCommunityMembershipStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.membership.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(statsPage);

  // 10. Validate pagination metadata
  const pagination: IPage.IPagination = statsPage.pagination;
  TestValidator.predicate(
    "statistics pagination should report at least one record",
    pagination.records >= 1,
  );

  TestValidator.predicate(
    "statistics data length should be positive when records >= 1",
    statsPage.data.length >= 1,
  );

  // 11. Validate statistics row for our community
  const targetStatsList = statsPage.data.filter(
    (s) => s.community_id === community.id,
  );

  TestValidator.equals(
    "exactly one statistics summary should exist for the created community",
    targetStatsList.length,
    1,
  );

  const targetStats: ICommunityPlatformCommunityMembershipStatistics.ISummary =
    targetStatsList[0];

  // total_members_count should match number of active memberships created
  TestValidator.equals(
    "total_members_count should equal the number of active memberships created",
    expectedActiveCount,
    targetStats.total_members_count,
  );

  // Derived counters must be non-negative and not exceed total_members_count when present
  if (targetStats.online_members_estimate !== undefined) {
    TestValidator.predicate(
      "online_members_estimate is non-negative and <= total_members_count",
      targetStats.online_members_estimate >= 0 &&
        targetStats.online_members_estimate <= targetStats.total_members_count,
    );
  }

  if (targetStats.daily_new_members_count !== undefined) {
    TestValidator.predicate(
      "daily_new_members_count is non-negative and <= total_members_count",
      targetStats.daily_new_members_count >= 0 &&
        targetStats.daily_new_members_count <= targetStats.total_members_count,
    );
  }

  if (targetStats.weekly_new_members_count !== undefined) {
    TestValidator.predicate(
      "weekly_new_members_count is non-negative and <= total_members_count",
      targetStats.weekly_new_members_count >= 0 &&
        targetStats.weekly_new_members_count <= targetStats.total_members_count,
    );
  }

  if (targetStats.monthly_new_members_count !== undefined) {
    TestValidator.predicate(
      "monthly_new_members_count is non-negative and <= total_members_count",
      targetStats.monthly_new_members_count >= 0 &&
        targetStats.monthly_new_members_count <=
          targetStats.total_members_count,
    );
  }
}
