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

export async function test_api_community_growth_statistics_granularity_and_time_range(
  connection: api.IConnection,
) {
  // 1. Register and login as platformAdmin to create a visibility level
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@platform.test`,
        password: "P@ssw0rd!",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.test/join",
        referrer: "https://admin.test/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // platformAdmin token is already applied to connection by SDK

  const visibilityCode = `vis-${RandomGenerator.alphabets(6)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Register and login as memberUser who will create community
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(8)}@member.test`,
        password: "P@ssw0rd!",
        ip: "127.0.0.2",
        href: "https://app.test/join",
        referrer: "https://app.test/home",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // Explicit login (though join already authenticated) to exercise login path and ensure token
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: "P@ssw0rd!",
        ip: "127.0.0.2",
        href: "https://app.test/login",
        referrer: "https://app.test/home",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  // 3. Create a community as memberUser using the visibility level code
  const communityIdentifier = `comm-${RandomGenerator.alphabets(6)}`;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: `Community ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Register and login as communityModerator
  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(8)}@moderator.test`,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
        ip: "127.0.0.3",
        href: "https://moderator.test/join",
        referrer: "https://moderator.test/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorJoin.id,
        password: "P@ssw0rd!",
        ip: "127.0.0.3",
        href: "https://moderator.test/login",
        referrer: "https://moderator.test/landing",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // 5. Create a membership request as memberUser (optional for stats)
  const memberUserConnection: api.IConnection = {
    ...connection,
  };
  const _memberRelogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(memberUserConnection, {
      body: {
        identifier: memberLogin.email,
        password: "P@ssw0rd!",
        ip: "127.0.0.2",
        href: "https://app.test/login2",
        referrer: "https://app.test/home",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(_memberRelogin);

  const membershipRequest1: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      memberUserConnection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join",
          answerText: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequest1);

  // 6. Switch to moderator and create memberships across time
  const moderatorConnection: api.IConnection = {
    ...connection,
  };
  const _moderatorRelogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(moderatorConnection, {
      body: {
        identifier: moderatorLogin.id,
        password: "P@ssw0rd!",
        ip: "127.0.0.3",
        href: "https://moderator.test/login2",
        referrer: "https://moderator.test/landing",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(_moderatorRelogin);

  // Prepare a few synthetic member users to create memberships for
  const extraMembers: ICommunityPlatformMemberuser.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const joinResult = await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(8)}+${i}@member.test`,
        password: "P@ssw0rd!",
        ip: "127.0.0.10",
        href: "https://app.test/join-extra",
        referrer: "https://app.test/home",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
    typia.assert(joinResult);
    extraMembers.push(joinResult);
  }

  // Back to moderator token in main connection
  const _moderatorRelogin2: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorLogin.id,
        password: "P@ssw0rd!",
        ip: "127.0.0.3",
        href: "https://moderator.test/login3",
        referrer: "https://moderator.test/landing",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(_moderatorRelogin2);

  // Create memberships for each extra member
  const memberships: ICommunityPlatformCommunityMembership[] = [];
  for (const member of extraMembers) {
    const membership: ICommunityPlatformCommunityMembership =
      await api.functional.communityPlatform.communityModerator.communities.memberships.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: {
            memberuser_id: member.id,
            is_active: true,
          } satisfies ICommunityPlatformCommunityMembership.ICreate,
        },
      );
    typia.assert(membership);
    memberships.push(membership);
  }

  TestValidator.predicate(
    "at least one membership should be created",
    memberships.length > 0,
  );

  // 7. Compute time range for statistics based on membership joined_at values
  const joinedTimes: Date[] = memberships.map((m) => new Date(m.joined_at));
  joinedTimes.sort((a, b) => a.getTime() - b.getTime());
  const minJoined = joinedTimes[0];
  const maxJoined = joinedTimes[joinedTimes.length - 1];

  const from = new Date(minJoined.getTime() - 1 * 60 * 60 * 1000);
  const to = new Date(maxJoined.getTime() + 1 * 60 * 60 * 1000);

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  // 8. Call growth statistics with day granularity
  const dayStatsPage: IPageICommunityPlatformCommunityGrowthStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      {
        body: {
          community_ids: [community.id],
          from: fromIso,
          to: toIso,
          granularity: "day",
          include_cumulative: true,
          include_period_deltas: true,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest,
      },
    );
  typia.assert(dayStatsPage);

  // Filter stats for our community
  const dayStats = dayStatsPage.data.filter(
    (s) => s.communityId === community.id,
  );

  TestValidator.predicate(
    "day stats should have at least one bucket for the community",
    dayStats.length > 0,
  );

  // Validate that buckets fall within [from, to) (with a small tolerance on end)
  for (const bucket of dayStats) {
    const start = new Date(bucket.startAt);
    const end = new Date(bucket.endAt);
    TestValidator.predicate(
      "bucket start should be within global window",
      start.getTime() >= from.getTime() && start.getTime() < to.getTime(),
    );
    TestValidator.predicate(
      "bucket end should be after start and not far beyond window",
      end.getTime() > start.getTime() &&
        end.getTime() <= to.getTime() + 24 * 60 * 60 * 1000,
    );
  }

  // Sum metrics across all day buckets and ensure they are non-negative and consistent
  const totalNewMembersDay = dayStats.reduce((sum, b) => sum + b.newMembers, 0);
  TestValidator.predicate(
    "total new members in day buckets should be at least number of created memberships",
    totalNewMembersDay >= memberships.length,
  );

  const totalNetChangeDay = dayStats.reduce(
    (sum, b) => sum + b.netMemberChange,
    0,
  );
  TestValidator.predicate(
    "total net member change in day buckets should be at least number of created memberships",
    totalNetChangeDay >= memberships.length,
  );

  // 9. Call growth statistics with week granularity and same window
  const weekStatsPage: IPageICommunityPlatformCommunityGrowthStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      {
        body: {
          community_ids: [community.id],
          from: fromIso,
          to: toIso,
          granularity: "week",
          include_cumulative: true,
          include_period_deltas: true,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest,
      },
    );
  typia.assert(weekStatsPage);

  const weekStats = weekStatsPage.data.filter(
    (s) => s.communityId === community.id,
  );

  TestValidator.predicate(
    "week stats should have at least one bucket for the community",
    weekStats.length > 0,
  );

  // Aggregate week stats and compare with day totals
  const totalNewMembersWeek = weekStats.reduce(
    (sum, b) => sum + b.newMembers,
    0,
  );
  TestValidator.predicate(
    "total new members in week buckets should be at least total in day buckets",
    totalNewMembersWeek >= totalNewMembersDay,
  );

  const totalNetChangeWeek = weekStats.reduce(
    (sum, b) => sum + b.netMemberChange,
    0,
  );
  TestValidator.predicate(
    "total net member change in week buckets should be at least total in day buckets",
    totalNetChangeWeek >= totalNetChangeDay,
  );

  // 10. Narrow time window and verify buckets/metrics adjust
  const narrowFrom = new Date(maxJoined.getTime() - 30 * 60 * 1000); // 30 minutes before last join
  const narrowTo = new Date(maxJoined.getTime() + 30 * 60 * 1000); // 30 minutes after
  const narrowFromIso = narrowFrom.toISOString();
  const narrowToIso = narrowTo.toISOString();

  const narrowDayStatsPage: IPageICommunityPlatformCommunityGrowthStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      {
        body: {
          community_ids: [community.id],
          from: narrowFromIso,
          to: narrowToIso,
          granularity: "day",
          include_cumulative: true,
          include_period_deltas: true,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest,
      },
    );
  typia.assert(narrowDayStatsPage);

  const narrowDayStats = narrowDayStatsPage.data.filter(
    (s) => s.communityId === community.id,
  );

  const totalNewMembersNarrowDay = narrowDayStats.reduce(
    (sum, b) => sum + b.newMembers,
    0,
  );

  TestValidator.predicate(
    "narrow window new members should not exceed broad window total",
    totalNewMembersNarrowDay <= totalNewMembersDay,
  );

  TestValidator.predicate(
    "narrow window should have at most as many buckets as full window",
    narrowDayStats.length <= dayStats.length,
  );

  // 11. Basic pagination consistency checks for one of the responses
  TestValidator.equals(
    "pagination limit should match requested limit",
    dayStatsPage.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination current page should be >= 1",
    dayStatsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records should be >= number of returned data",
    dayStatsPage.pagination.records >= dayStatsPage.data.length,
  );
}
