import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityGrowthStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityGrowthStatistics";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityGrowthStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityGrowthStatistics";

export async function test_api_community_growth_statistics_empty_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) to get admin context
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `code_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (registers) to get member context
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@member.test.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: "https://app.test.com/signup" as string & tags.Format<"uri">,
    referrer: "https://app.test.com/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. Create a community with that visibility level as member user
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // Helper to build a future empty-events time window
  const now = new Date();
  const fromDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const toDate = new Date(fromDate.getTime() + 1 * 1000); // +1 second
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // 5. Call growth statistics filtered by community_ids with a small future window
  const requestByIds = {
    community_ids: [community.id],
    from: fromIso,
    to: toIso,
    granularity: "day" as const,
    include_cumulative: true,
    include_period_deltas: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest;

  const statsByIds: IPageICommunityPlatformCommunityGrowthStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      { body: requestByIds },
    );
  typia.assert<IPageICommunityPlatformCommunityGrowthStatistics.ISummary>(
    statsByIds,
  );

  // 6. Validate empty or zero metrics behavior for statsByIds
  const paginationByIds = statsByIds.pagination;
  const dataByIds = statsByIds.data;

  const isTrulyEmptyByIds =
    paginationByIds.records === 0 &&
    paginationByIds.pages === 0 &&
    dataByIds.length === 0;

  let allZeroMetricsByIds = true;
  for (const row of dataByIds) {
    if (
      row.newMembers !== 0 ||
      row.lostMembers !== 0 ||
      row.netMemberChange !== 0 ||
      row.activeMembers !== 0 ||
      row.newPosts !== 0 ||
      row.newComments !== 0
    ) {
      allZeroMetricsByIds = false;
      break;
    }
  }

  await TestValidator.predicate(
    "growth stats by community_ids must either be empty or have all zero metrics",
    async () => isTrulyEmptyByIds || allZeroMetricsByIds,
  );

  if (!isTrulyEmptyByIds) {
    TestValidator.predicate(
      "when not truly empty, pagination.records must be >= data.length",
      paginationByIds.records >= dataByIds.length,
    );
    TestValidator.predicate(
      "when not truly empty, pagination.pages must be >= 1",
      paginationByIds.pages >= 1,
    );
  }

  // 7. Call growth statistics filtered by community_codes with a slightly larger window
  const fromDate2 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  const toDate2 = new Date(fromDate2.getTime() + 24 * 60 * 60 * 1000); // +1 day
  const requestByCodes = {
    community_codes: [community.identifier],
    from: fromDate2.toISOString(),
    to: toDate2.toISOString(),
    granularity: "day" as const,
    include_cumulative: true,
    include_period_deltas: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest;

  const statsByCodes: IPageICommunityPlatformCommunityGrowthStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      { body: requestByCodes },
    );
  typia.assert<IPageICommunityPlatformCommunityGrowthStatistics.ISummary>(
    statsByCodes,
  );

  const paginationByCodes = statsByCodes.pagination;
  const dataByCodes = statsByCodes.data;

  // Ensure metrics are all zeros for all returned rows (no membership/posts created in test)
  for (const row of dataByCodes) {
    TestValidator.equals(
      "newMembers should be zero for empty activity window",
      row.newMembers,
      0,
    );
    TestValidator.equals(
      "lostMembers should be zero for empty activity window",
      row.lostMembers,
      0,
    );
    TestValidator.equals(
      "netMemberChange should be zero for empty activity window",
      row.netMemberChange,
      0,
    );
    TestValidator.equals(
      "activeMembers should be zero for empty activity window",
      row.activeMembers,
      0,
    );
    TestValidator.equals(
      "newPosts should be zero for empty activity window",
      row.newPosts,
      0,
    );
    TestValidator.equals(
      "newComments should be zero for empty activity window",
      row.newComments,
      0,
    );
  }

  // Pagination consistency checks for statsByCodes
  TestValidator.predicate(
    "pagination.records must be >= data.length for statsByCodes",
    paginationByCodes.records >= dataByCodes.length,
  );
  if (paginationByCodes.records === 0) {
    TestValidator.equals(
      "when records is zero, pages must be zero for statsByCodes",
      paginationByCodes.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages must be >= 1 for statsByCodes",
      paginationByCodes.pages >= 1,
    );
  }

  // 8. Call growth statistics using a completely unrelated random community ID to ensure truly empty result
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  const requestRandomId = {
    community_ids: [randomCommunityId],
    from: fromIso,
    to: toIso,
    granularity: "day" as const,
    include_cumulative: true,
    include_period_deltas: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest;

  const statsRandomId: IPageICommunityPlatformCommunityGrowthStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      { body: requestRandomId },
    );
  typia.assert<IPageICommunityPlatformCommunityGrowthStatistics.ISummary>(
    statsRandomId,
  );

  TestValidator.equals(
    "random community id should yield zero records",
    statsRandomId.pagination.records,
    0,
  );
  TestValidator.equals(
    "random community id should yield zero pages",
    statsRandomId.pagination.pages,
    0,
  );
  TestValidator.equals(
    "random community id should yield empty data array",
    statsRandomId.data.length,
    0,
  );
}
