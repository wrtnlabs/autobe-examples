import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { ICommunityPlatformUserSanctionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatistics";
import type { ICommunityPlatformUserSanctionStatisticsByActorTypeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsByActorTypeBucket";
import type { ICommunityPlatformUserSanctionStatisticsByCommunityBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsByCommunityBucket";
import type { ICommunityPlatformUserSanctionStatisticsByTypeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsByTypeBucket";
import type { ICommunityPlatformUserSanctionStatisticsTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsTimeBucket";

export async function test_api_user_sanction_statistics_filtered_by_type_and_severity(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and authenticate
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user and authenticate
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
    ip: null,
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. As member user, create a report that will be used as basis for sanctions
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 6. Switch back to platform admin for creating sanctions
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // Prepare a known time window
  const baseFromDate = new Date();
  const baseToDate = new Date(baseFromDate.getTime() + 60 * 60 * 1000); // +1 hour
  const fromIso = baseFromDate.toISOString();
  const toIso = baseToDate.toISOString();

  // Helper to create date offsets inside the window
  const offsetWithinWindow = (minutes: number): string => {
    const d = new Date(baseFromDate.getTime() + minutes * 60 * 1000);
    return d.toISOString();
  };

  // 7. Create multiple sanctions with various type+severity-related combinations
  const matchingType = "temporary_community_ban";
  const matchingSeverity = "medium";

  const sanctions: ICommunityPlatformUserSanction[] = [];

  // Create 3 matching sanctions: type=temporary_community_ban (report severity=medium)
  await ArrayUtil.asyncForEach([0, 10, 20], async (minutes, index) => {
    const sanctionCreateBody = {
      community_platform_report_id: report.id,
      sanctioned_memberuser_id: memberAuthorized.id,
      community_id: community.id,
      sanction_type: matchingType,
      status: "active",
      effective_from: offsetWithinWindow(minutes),
      effective_until: offsetWithinWindow(minutes + 5),
      reason_summary: `matching sanction ${index + 1}`,
      notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformUserSanction.ICreate;
    const created: ICommunityPlatformUserSanction =
      await api.functional.communityPlatform.platformAdmin.userSanctions.create(
        connection,
        { body: sanctionCreateBody },
      );
    typia.assert(created);
    sanctions.push(created);
  });

  // Create 2 non-matching sanctions: different type or severity context
  const nonMatchingConfigs: Array<{
    type: string;
    label: string;
  }> = [
    {
      type: "permanent_platform_ban",
      label: "non-matching 1",
    },
    {
      type: "temporary_community_ban",
      label: "non-matching 2",
    },
  ];

  await ArrayUtil.asyncForEach(nonMatchingConfigs, async (cfg, idx) => {
    const sanctionCreateBody = {
      community_platform_report_id: report.id,
      sanctioned_memberuser_id: memberAuthorized.id,
      community_id: community.id,
      sanction_type: cfg.type,
      status: "active",
      effective_from: offsetWithinWindow(30 + idx * 5),
      effective_until: offsetWithinWindow(35 + idx * 5),
      reason_summary: cfg.label,
      notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformUserSanction.ICreate;
    const created: ICommunityPlatformUserSanction =
      await api.functional.communityPlatform.platformAdmin.userSanctions.create(
        connection,
        { body: sanctionCreateBody },
      );
    typia.assert(created);
    sanctions.push(created);
  });

  // 8. Build statistics request filtered by matching type and severity
  const statsRequestBody = {
    from: fromIso,
    to: toIso,
    sanctionTypes: [matchingType],
    severityLevels: [matchingSeverity],
    communityIds: [community.id],
    userIds: [memberAuthorized.id],
    groupBy: ["type", "severity"],
  } satisfies ICommunityPlatformUserSanctionStatistics.IRequest;

  const stats: ICommunityPlatformUserSanctionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.userSanctions.index(
      connection,
      { body: statsRequestBody },
    );
  typia.assert(stats);

  // 9. Compute expected matching count
  const expectedMatchingCount = sanctions.filter((s) => {
    const from = s.effective_from;
    const until = s.effective_until ?? s.effective_from;
    return (
      s.sanction_type === matchingType &&
      report.severity === matchingSeverity &&
      from >= fromIso &&
      until <= toIso
    );
  }).length;

  // 10. Assert totalSanctions equals expected matching count
  TestValidator.equals(
    "totalSanctions matches expected filtered count",
    stats.totalSanctions,
    expectedMatchingCount,
  );

  // 11. Assert sanctionsByType has only temporary_community_ban bucket
  const byType = stats.sanctionsByType ?? [];
  const typeBucket = byType.find(
    (b: ICommunityPlatformUserSanctionStatisticsByTypeBucket) =>
      b.sanctionType === matchingType,
  );

  TestValidator.predicate(
    "sanctionsByType contains temporary_community_ban bucket",
    typeBucket !== undefined,
  );

  if (typeBucket !== undefined) {
    TestValidator.equals(
      "temporary_community_ban bucket count matches expected",
      typeBucket.count,
      expectedMatchingCount,
    );
  }

  TestValidator.equals(
    "sanctionsByType has at most one bucket for temporary_community_ban",
    byType.filter(
      (b) =>
        b.sanctionType === matchingType &&
        b.count === (typeBucket?.count ?? -1),
    ).length,
    typeBucket ? 1 : 0,
  );

  TestValidator.predicate(
    "sanctionsByType has no buckets for other types",
    byType.every((b) => b.sanctionType === matchingType),
  );

  // 12. Assert sanctionsBySeverity has only medium bucket
  const bySeverity = stats.sanctionsBySeverity ?? [];
  const severityBucket = bySeverity.find(
    (b) => b.severity === matchingSeverity,
  );

  TestValidator.predicate(
    "sanctionsBySeverity contains medium bucket",
    severityBucket !== undefined,
  );

  if (severityBucket !== undefined) {
    TestValidator.equals(
      "medium severity bucket count matches expected",
      severityBucket.count,
      expectedMatchingCount,
    );
  }

  TestValidator.equals(
    "sanctionsBySeverity has at most one bucket for medium",
    bySeverity.filter(
      (b) =>
        b.severity === matchingSeverity &&
        b.count === (severityBucket?.count ?? -1),
    ).length,
    severityBucket ? 1 : 0,
  );

  TestValidator.predicate(
    "sanctionsBySeverity has no buckets for other severities",
    bySeverity.every((b) => b.severity === matchingSeverity),
  );

  // 13. Optional: Narrow the time window to exclude later sanctions
  const narrowerToDate = new Date(baseFromDate.getTime() + 25 * 60 * 1000);
  const narrowerToIso = narrowerToDate.toISOString();

  const narrowRequestBody = {
    from: fromIso,
    to: narrowerToIso,
    sanctionTypes: [matchingType],
    severityLevels: [matchingSeverity],
    communityIds: [community.id],
    userIds: [memberAuthorized.id],
    groupBy: ["type", "severity"],
  } satisfies ICommunityPlatformUserSanctionStatistics.IRequest;

  const narrowStats: ICommunityPlatformUserSanctionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.userSanctions.index(
      connection,
      { body: narrowRequestBody },
    );
  typia.assert(narrowStats);

  const expectedNarrowMatchingCount = sanctions.filter((s) => {
    const from = s.effective_from;
    const until = s.effective_until ?? s.effective_from;
    return (
      s.sanction_type === matchingType &&
      report.severity === matchingSeverity &&
      from >= fromIso &&
      until <= narrowerToIso
    );
  }).length;

  TestValidator.equals(
    "narrowed totalSanctions matches expected count",
    narrowStats.totalSanctions,
    expectedNarrowMatchingCount,
  );
}
