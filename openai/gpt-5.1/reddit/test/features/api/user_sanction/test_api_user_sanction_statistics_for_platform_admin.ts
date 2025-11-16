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

/**
 * Validate aggregated user sanction statistics for platform administrators.
 *
 * Business flow:
 *
 * 1. Create and authenticate a platform admin.
 * 2. As platform admin, create a community visibility level.
 * 3. Create and authenticate a member user.
 * 4. As member user, create a community that uses the created visibility level.
 * 5. As member user, create a moderation report.
 * 6. As platform admin, create a user sanction referencing the report and
 *    optionally scoped to the created community.
 * 7. Build a statistics request over a time window covering the sanction and with
 *    groupBy dimensions for type, community, actorType, severity, and time.
 * 8. Call the statistics endpoint and assert that aggregates reflect the created
 *    sanction.
 */
export async function test_api_user_sanction_statistics_for_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates and sets Authorization header).
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a community visibility level.
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user (join also authenticates as member user).
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community with the created visibility code.
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 5. As member user, create a report. We only need a valid reason_category_id,
  // but we don't have an API to create categories, so we rely on random UUID
  // consistent with type; backend may accept or reject based on seed data.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 6. Switch back to platform admin by logging in explicitly to ensure
  // Authorization header is in platformAdmin context when creating sanctions.
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 7. Create a user sanction referencing the report. We need a target member
  // user id; since the report DTO does not expose the sanctioned user, we use
  // the reporting member as the sanctioned subject to keep the test feasible.
  const effectiveFrom = new Date();
  const effectiveUntil = new Date(effectiveFrom.getTime() + 60 * 60 * 1000);

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom.toISOString(),
    effective_until: effectiveUntil.toISOString(),
    reason_summary: "Test sanction for statistics",
    notes_internal: "E2E statistics test",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionCreateBody },
    );
  typia.assert(sanction);

  // 8. Build statistics request covering the sanction time window.
  const from = new Date(effectiveFrom.getTime() - 5 * 60 * 1000);
  const to = new Date(effectiveUntil.getTime() + 5 * 60 * 1000);

  const requestBody = {
    from: from.toISOString(),
    to: to.toISOString(),
    sanctionTypes: [sanction.sanction_type],
    severityLevels: [],
    communityIds: [community.id],
    actorTypes: [],
    userIds: [sanction.sanctioned_memberUser.id],
    groupBy: ["type", "actorType", "community", "time"],
    timeGranularity: "hourly",
  } satisfies ICommunityPlatformUserSanctionStatistics.IRequest;

  const stats: ICommunityPlatformUserSanctionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.userSanctions.index(
      connection,
      { body: requestBody },
    );
  typia.assert(stats);

  // 9. Validate high-level totals.
  TestValidator.predicate(
    "total sanctions should be at least 1",
    stats.totalSanctions >= 1,
  );

  // 10. Validate sanctionsByType contains our sanction type when present.
  if (stats.sanctionsByType && stats.sanctionsByType.length > 0) {
    const matchingTypeBucket = stats.sanctionsByType.find(
      (bucket: ICommunityPlatformUserSanctionStatisticsByTypeBucket) =>
        bucket.sanctionType === sanction.sanction_type,
    );

    if (matchingTypeBucket) {
      TestValidator.predicate(
        "type bucket count should be at least 1",
        matchingTypeBucket.count >= 1,
      );
    }
  }

  // 11. Validate sanctionsByCommunity contains our community when present.
  if (stats.sanctionsByCommunity && stats.sanctionsByCommunity.length > 0) {
    const matchingCommunityBucket = stats.sanctionsByCommunity.find(
      (bucket: ICommunityPlatformUserSanctionStatisticsByCommunityBucket) =>
        bucket.communityId === (sanction.community?.id ?? community.id),
    );

    if (matchingCommunityBucket) {
      TestValidator.predicate(
        "community bucket count should be at least 1",
        matchingCommunityBucket.count >= 1,
      );
    }
  }

  // 12. Validate sanctionsByActorType when present.
  if (stats.sanctionsByActorType && stats.sanctionsByActorType.length > 0) {
    const platformAdminBucket = stats.sanctionsByActorType.find(
      (bucket: ICommunityPlatformUserSanctionStatisticsByActorTypeBucket) =>
        bucket.actorType === "platformAdmin",
    );

    if (platformAdminBucket) {
      TestValidator.predicate(
        "platformAdmin actorType bucket count should be at least 1",
        platformAdminBucket.count >= 1,
      );
    }
  }

  // 13. Validate timeSeries when present.
  if (stats.timeSeries && stats.timeSeries.length > 0) {
    const anyBucketHasCount = stats.timeSeries.some(
      (bucket: ICommunityPlatformUserSanctionStatisticsTimeBucket) =>
        bucket.count >= 1,
    );

    TestValidator.predicate(
      "at least one time bucket should have sanctions",
      anyBucketHasCount,
    );
  }
}
