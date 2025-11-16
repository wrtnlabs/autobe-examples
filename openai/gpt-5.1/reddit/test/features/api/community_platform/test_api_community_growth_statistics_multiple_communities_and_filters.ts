import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityGrowthStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityGrowthStatistics";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityGrowthStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityGrowthStatistics";

/**
 * Validate community growth statistics filtering and pagination across multiple
 * communities.
 *
 * Business flow:
 *
 * 1. Platform admin joins and creates two visibility levels: public and private.
 * 2. Member user joins and creates three communities, some public and some
 *    private.
 * 3. Community moderator joins and creates memberships for each community.
 * 4. Member user creates membership requests for a subset of communities.
 * 5. Statistics endpoint is called with filters over community_ids,
 *    community_codes, and visibility_levels.
 * 6. Pagination behavior is verified by requesting multiple pages with small
 *    limit.
 */
export async function test_api_community_growth_statistics_multiple_communities_and_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin registration (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      ip: undefined,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create visibility levels: public and private
  const publicVisibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: "public",
          name: "Public",
          description: "Public community visible to everyone",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(publicVisibility);

  const privateVisibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: "private",
          name: "Private",
          description: "Private community visible only to invited members",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(privateVisibility);

  // 3. Member user registration
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = RandomGenerator.alphabets(12);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/join",
      referrer: "https://community.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // 4. Create three communities with different visibility levels as memberUser
  const communityPublicA =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `public-alpha-${RandomGenerator.alphaNumeric(6)}`,
          title: "Public Alpha Community",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: publicVisibility.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityPublicA);

  const communityPublicB =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `public-beta-${RandomGenerator.alphaNumeric(6)}`,
          title: "Public Beta Community",
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: publicVisibility.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityPublicB);

  const communityPrivate =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `private-gamma-${RandomGenerator.alphaNumeric(6)}`,
          title: "Private Gamma Community",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibilityLevelCode: privateVisibility.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityPrivate);

  // 5. Community moderator registration
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword = RandomGenerator.alphabets(12);

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://moderator.example.com/join",
        referrer: "https://moderator.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorJoin);

  // 6. MemberUser creates membership requests for two communities
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const requestPublicA =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityPublicA.identifier,
        body: {
          questionKey: "why_join",
          answerText: "I want to participate in public alpha community.",
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(requestPublicA);

  const requestPrivate =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityPrivate.identifier,
        body: {
          questionKey: "motivation",
          answerText: "Interested in private discussions.",
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(requestPrivate);

  // 7. Moderator creates memberships for each community
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://moderator.example.com/login",
      referrer: "https://moderator.example.com/landing",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const memberships: ICommunityPlatformCommunityMembership[] = [];

  const communities = [communityPublicA, communityPublicB, communityPrivate];

  for (const community of communities) {
    const memberCount = 2;
    for (let i = 0; i < memberCount; i++) {
      const membership =
        await api.functional.communityPlatform.communityModerator.communities.memberships.create(
          connection,
          {
            communityIdentifier: community.identifier,
            body: {
              memberuser_id: memberJoin.id,
              is_active: true,
            } satisfies ICommunityPlatformCommunityMembership.ICreate,
          },
        );
      typia.assert(membership);
      memberships.push(membership);
    }
  }

  // 8. Prepare time window for growth statistics
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - sevenDaysMs);
  const fromIso = fromDate.toISOString();
  const toIso = now.toISOString();

  const allCommunityIds = [
    communityPublicA.id,
    communityPublicB.id,
    communityPrivate.id,
  ];

  const publicCommunityIds = [communityPublicA.id, communityPublicB.id];

  const privateCommunityIds = [communityPrivate.id];

  // 9. Call statistics endpoint with public visibility filter
  const limit = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  const publicStatsPage1 =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      {
        body: {
          community_ids: publicCommunityIds,
          community_codes: [
            communityPublicA.identifier,
            communityPublicB.identifier,
          ],
          visibility_levels: ["public"],
          from: fromIso as string & tags.Format<"date-time">,
          to: toIso as string & tags.Format<"date-time">,
          granularity: "week",
          include_cumulative: true,
          include_period_deltas: true,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
        } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest,
      },
    );
  typia.assert(publicStatsPage1);

  TestValidator.predicate(
    "public stats page1 pagination limit honored",
    publicStatsPage1.pagination.limit === limit,
  );
  TestValidator.predicate(
    "public stats page1 current page is 1",
    publicStatsPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "public stats data length <= limit",
    publicStatsPage1.data.length <= limit,
  );

  // Verify that all returned communityIds correspond to public communities
  const publicIdsSet = new Set(publicCommunityIds);
  for (const summary of publicStatsPage1.data) {
    TestValidator.predicate(
      "summary communityId belongs to public communities",
      publicIdsSet.has(summary.communityId),
    );
  }

  // 10. Statistics for private visibility filter
  const privateStats =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      {
        body: {
          community_ids: privateCommunityIds,
          community_codes: [communityPrivate.identifier],
          visibility_levels: ["private"],
          from: fromIso as string & tags.Format<"date-time">,
          to: toIso as string & tags.Format<"date-time">,
          granularity: "week",
          include_cumulative: true,
          include_period_deltas: true,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
        } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest,
      },
    );
  typia.assert(privateStats);

  TestValidator.predicate(
    "private stats pagination limit honored",
    privateStats.pagination.limit === limit,
  );

  const privateIdsSet = new Set(privateCommunityIds);
  for (const summary of privateStats.data) {
    TestValidator.predicate(
      "summary communityId belongs to private communities",
      privateIdsSet.has(summary.communityId),
    );
  }

  // 11. Statistics without visibility filter but all community_ids
  const allStatsPage1 =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      {
        body: {
          community_ids: allCommunityIds,
          community_codes: [
            communityPublicA.identifier,
            communityPublicB.identifier,
            communityPrivate.identifier,
          ],
          visibility_levels: undefined,
          from: fromIso as string & tags.Format<"date-time">,
          to: toIso as string & tags.Format<"date-time">,
          granularity: "week",
          include_cumulative: true,
          include_period_deltas: true,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit,
        } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest,
      },
    );
  typia.assert(allStatsPage1);

  TestValidator.predicate(
    "all stats page1 limit honored",
    allStatsPage1.pagination.limit === limit,
  );

  // Fetch second page for pagination behavior if available
  if (allStatsPage1.pagination.pages >= 2) {
    const allStatsPage2 =
      await api.functional.communityPlatform.statistics.communities.growth.index(
        connection,
        {
          body: {
            community_ids: allCommunityIds,
            community_codes: [
              communityPublicA.identifier,
              communityPublicB.identifier,
              communityPrivate.identifier,
            ],
            visibility_levels: undefined,
            from: fromIso as string & tags.Format<"date-time">,
            to: toIso as string & tags.Format<"date-time">,
            granularity: "week",
            include_cumulative: true,
            include_period_deltas: true,
            page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit,
          } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest,
        },
      );
    typia.assert(allStatsPage2);

    TestValidator.predicate(
      "all stats page2 current page is 2",
      allStatsPage2.pagination.current === 2,
    );

    const combinedSummaries = [...allStatsPage1.data, ...allStatsPage2.data];

    // Ensure all summaries have communityId from our created communities
    const allIdsSet = new Set(allCommunityIds);
    for (const summary of combinedSummaries) {
      TestValidator.predicate(
        "combined summary communityId is one of created communities",
        allIdsSet.has(summary.communityId),
      );
    }
  }
}
