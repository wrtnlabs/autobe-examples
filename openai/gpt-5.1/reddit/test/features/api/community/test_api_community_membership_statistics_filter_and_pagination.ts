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

export async function test_api_community_membership_statistics_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin to create visibility levels
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create two visibility levels: public and restricted
  const visibilityPublic: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(5)}`,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityPublic);

  const visibilityRestricted: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `restricted-${RandomGenerator.alphabets(5)}`,
          name: "Restricted",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityRestricted);

  // 3. Register a member user who will create communities
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://marketing.example.com/campaign",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 4. As memberUser, create three communities with different visibility levels
  const communityIdentifiers: string[] = [];
  const communityIdByIdentifier = new Map<string, string>();

  const communityPayloads: ICommunityPlatformCommunity.ICreate[] = [
    {
      identifier: `community-${RandomGenerator.alphabets(6)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      visibilityLevelCode: visibilityPublic.code,
      isNsfw: false,
      primaryTagIds: undefined,
    },
    {
      identifier: `community-${RandomGenerator.alphabets(6)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      visibilityLevelCode: visibilityRestricted.code,
      isNsfw: false,
      primaryTagIds: undefined,
    },
    {
      identifier: `community-${RandomGenerator.alphabets(6)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      visibilityLevelCode: visibilityPublic.code,
      isNsfw: true,
      primaryTagIds: undefined,
    },
  ];

  const createdCommunities: ICommunityPlatformCommunity[] = [];

  for (const payload of communityPayloads) {
    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: payload,
        },
      );
    typia.assert(community);
    createdCommunities.push(community);
    communityIdentifiers.push(community.identifier);
    communityIdByIdentifier.set(community.identifier, community.id);
  }

  // 5. Register a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 6. Create varying numbers of memberships for each community
  // For simplicity we use the same memberUser.id in all memberships.
  const membershipCounts = new Map<string, number>();
  const membershipVolumes = [1, 3, 5]; // different sizes for each community

  for (let i = 0; i < createdCommunities.length; i++) {
    const community = createdCommunities[i];
    const count = membershipVolumes[i];

    for (let j = 0; j < count; j++) {
      const membershipCreateBody = {
        memberuser_id: memberUser.id,
        is_active: true,
      } satisfies ICommunityPlatformCommunityMembership.ICreate;

      const membership: ICommunityPlatformCommunityMembership =
        await api.functional.communityPlatform.communityModerator.communities.memberships.create(
          connection,
          {
            communityIdentifier: community.identifier,
            body: membershipCreateBody,
          },
        );
      typia.assert(membership);
    }
    membershipCounts.set(community.id, count);
  }

  // 7. Optionally create membership requests for one or more communities
  const targetForRequest = createdCommunities[0];
  const membershipRequestBody = {
    questionKey: "why-join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: targetForRequest.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 8. Call statistics endpoint with filters, pagination and ordering
  const filteredIdentifiers = communityIdentifiers.slice(0, 2);
  const allowedCommunityIds = new Set<string>(
    filteredIdentifiers
      .map((identifier) => communityIdByIdentifier.get(identifier))
      .filter((id): id is string => id !== undefined),
  );

  const minActiveMembersValue = 1;
  const limitValue = 2;

  const requestBodyPage0 = {
    communityIdentifiers: filteredIdentifiers,
    minActiveMembers: minActiveMembersValue satisfies number as number &
      tags.Type<"int32">,
    page: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limitValue satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    orderBy: "total_members_count",
    orderDirection: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembershipStatistics.IRequest;

  const page0: IPageICommunityPlatformCommunityMembershipStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.membership.index(
      connection,
      {
        body: requestBodyPage0,
      },
    );
  typia.assert(page0);

  const pagination0 = page0.pagination;
  const data0 = page0.data;

  // Basic pagination metadata validation
  TestValidator.equals(
    "pagination limit matches request",
    pagination0.limit,
    requestBodyPage0.limit,
  );
  TestValidator.equals(
    "pagination current matches request",
    pagination0.current,
    requestBodyPage0.page,
  );
  TestValidator.predicate(
    "records must be >= number of entries returned",
    pagination0.records >= (data0.length as number),
  );

  // 9. Validate filtering and minActiveMembers constraint
  for (const stat of data0) {
    TestValidator.predicate(
      "statistics community_id must correspond to filtered identifiers",
      allowedCommunityIds.has(stat.community_id),
    );

    TestValidator.predicate(
      "total_members_count respects minActiveMembers threshold",
      stat.total_members_count >=
        (requestBodyPage0.minActiveMembers as number & tags.Type<"int32">),
    );
  }

  // 10. Confirm ordering by total_members_count descending on page 0
  for (let i = 1; i < data0.length; i++) {
    TestValidator.predicate(
      "statistics ordered by total_members_count desc (page 0)",
      data0[i - 1].total_members_count >= data0[i].total_members_count,
    );
  }

  // 11. Exercise pagination with another page and ensure consistency
  const requestBodyPage1 = {
    ...requestBodyPage0,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies ICommunityPlatformCommunityMembershipStatistics.IRequest;

  const page1: IPageICommunityPlatformCommunityMembershipStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.membership.index(
      connection,
      {
        body: requestBodyPage1,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  TestValidator.equals(
    "page1 pagination limit matches request",
    pagination1.limit,
    requestBodyPage1.limit,
  );
  TestValidator.equals(
    "page1 pagination current matches request",
    pagination1.current,
    requestBodyPage1.page,
  );

  // Ensure that total records reported is at least the combined data length
  const combinedLength = (data0.length as number) + (data1.length as number);
  TestValidator.predicate(
    "combined page data does not exceed reported records",
    combinedLength <= (pagination0.records as number),
  );

  // Ensure ordering also holds within page1
  for (let i = 1; i < data1.length; i++) {
    TestValidator.predicate(
      "statistics ordered by total_members_count desc (page 1)",
      data1[i - 1].total_members_count >= data1[i].total_members_count,
    );
  }
}
