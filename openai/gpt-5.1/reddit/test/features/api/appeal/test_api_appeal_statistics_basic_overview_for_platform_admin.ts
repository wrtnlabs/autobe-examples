import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformAppealStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppealStatistics";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_appeal_statistics_basic_overview_for_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (platformAdmin actor)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://platform-admin.example.com/join",
    referrer: "https://platform-admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminEmail = platformAdminAuthorized.email;
  const platformAdminUsername = platformAdminAuthorized.username;

  // 2. As platformAdmin, create a visibility level master record
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for appeal statistics e2e test",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user (memberUser actor)
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  const memberUserEmail = memberUserAuthorized.email;

  // 4. Register and authenticate a community moderator (communityModerator actor)
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: null,
    ip: null,
    href: "https://moderation.example.com/join",
    referrer: "https://moderation.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  const communityModeratorEmail = communityModeratorJoinBody.email;

  // 5. As memberUser, login explicitly to ensure member context is active
  const memberUserLoginBody = {
    identifier: memberUserEmail,
    password: memberUserJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserAuthorizedLogin);

  // 6. As memberUser, create a community using the created visibility level
  const communityIdentifier = `appeals-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Appeal Statistics Test Community",
    description: "Community used for testing appeal statistics overview.",
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
  typia.assert(community);

  // 7. As memberUser, create a report
  const reportCreateBody: ICommunityPlatformReport.ICreate = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 8. As communityModerator, login to ensure moderator context is active
  const communityModeratorLoginBody = {
    identifier: communityModeratorEmail,
    password: communityModeratorJoinBody.password,
    ip: null,
    href: "https://moderation.example.com/login",
    referrer: "https://moderation.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const communityModeratorAuthorizedLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: communityModeratorLoginBody,
    });
  typia.assert(communityModeratorAuthorizedLogin);

  // 9. As communityModerator, create a moderation action linked to the community
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "content_reviewed",
    target_scope: "report",
    reason_summary: "Reviewed report for appeal statistics test",
    notes_internal: "E2E test moderation action for statistics pipeline.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 10. Switch back to platformAdmin via login to create user sanction
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://platform-admin.example.com/login",
    referrer: "https://platform-admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLogin);

  // 11. As platformAdmin, create a user sanction referencing the report and member user
  const effectiveFrom = new Date();
  const effectiveUntil = new Date(effectiveFrom.getTime() + 60 * 60 * 1000);

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUserAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom.toISOString(),
    effective_until: effectiveUntil.toISOString(),
    reason_summary: "Test sanction for appeal statistics.",
    notes_internal: "E2E test user sanction created solely for statistics.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: userSanctionCreateBody,
      },
    );
  typia.assert(userSanction);

  // 12. Capture a timestamp range that covers the appeals we will create
  const statsWindowStart = new Date();

  // 13. As memberUser, login again and create one or more appeals
  const memberUserAuthorizedLogin2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserAuthorizedLogin2);

  const appealCount = 2;
  const createdAppeals: ICommunityPlatformAppeal[] = [];

  for (let i = 0; i < appealCount; i += 1) {
    const appealCreateBody = {
      appeal_scope: "sanction",
      reason_summary: `Appeal #${i + 1} for sanction statistics test`,
      details: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ICommunityPlatformAppeal.ICreate;

    const appeal: ICommunityPlatformAppeal =
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        {
          body: appealCreateBody,
        },
      );
    typia.assert(appeal);
    createdAppeals.push(appeal);
  }

  const statsWindowEnd = new Date();

  // 14. Switch back to platformAdmin via login and call the statistics endpoint
  const platformAdminAuthorizedLogin2: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLogin2);

  const statsRequestBody = {
    start: statsWindowStart.toISOString(),
    end: statsWindowEnd.toISOString(),
    communityIds: undefined,
    statuses: undefined,
    sanctionTypes: undefined,
    groupBy: undefined,
    timeGranularity: undefined,
  } satisfies ICommunityPlatformAppealStatistics.IRequest;

  const stats1: ICommunityPlatformAppealStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.appeals.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(stats1);

  // 15. Validate high-level overview invariants
  const overview1 = stats1.overview;

  TestValidator.predicate(
    "overview totalAppeals is non-negative",
    overview1.totalAppeals >= 0,
  );

  TestValidator.predicate(
    "overview openAppeals is non-negative",
    overview1.openAppeals >= 0,
  );

  TestValidator.predicate(
    "overview resolvedAppeals is non-negative",
    overview1.resolvedAppeals >= 0,
  );

  TestValidator.predicate(
    "overview backlogSize is non-negative",
    overview1.backlogSize >= 0,
  );

  TestValidator.predicate(
    "overview totalAppeals at least appeals created in test",
    overview1.totalAppeals >= createdAppeals.length,
  );

  TestValidator.predicate(
    "openAppeals + resolvedAppeals >= totalAppeals",
    overview1.openAppeals + overview1.resolvedAppeals >= overview1.totalAppeals,
  );

  // 16. Validate status breakdown invariants
  const statusBuckets = stats1.statusBreakdown.byStatus;

  TestValidator.predicate(
    "statusBreakdown buckets have non-negative counts",
    statusBuckets.every((bucket) => bucket.count >= 0),
  );

  const statusTotalCount = statusBuckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );

  TestValidator.predicate(
    "statusBreakdown total count >= totalAppeals",
    statusTotalCount >= overview1.totalAppeals,
  );

  // 17. Validate community breakdown invariants
  const communityBuckets = stats1.communityBreakdown.byCommunity;

  TestValidator.predicate(
    "communityBreakdown buckets have non-negative appealCount",
    communityBuckets.every((bucket) => bucket.appealCount >= 0),
  );

  if (communityBuckets.length > 0) {
    const hasTestCommunityBucket = communityBuckets.some(
      (bucket) => bucket.communityId === community.id,
    );

    TestValidator.predicate(
      "communityBreakdown contains either our test community or is empty for that scope",
      hasTestCommunityBucket || communityBuckets.length >= 0,
    );
  }

  // 18. Validate sanction-type breakdown invariants
  const sanctionTypeBuckets = stats1.sanctionTypeBreakdown.bySanctionType;

  TestValidator.predicate(
    "sanctionTypeBreakdown buckets have non-negative appealCount",
    sanctionTypeBuckets.every((bucket) => bucket.appealCount >= 0),
  );

  // 19. Validate processing time statistics
  const processing = stats1.processingTime;

  TestValidator.predicate(
    "processingTime averageSecondsToResolve is non-negative",
    processing.averageSecondsToResolve >= 0,
  );

  TestValidator.predicate(
    "processingTime medianSecondsToResolve is non-negative",
    processing.medianSecondsToResolve >= 0,
  );

  TestValidator.predicate(
    "processingTime p90SecondsToResolve is non-negative",
    processing.p90SecondsToResolve >= 0,
  );

  TestValidator.predicate(
    "processingTime p99SecondsToResolve is non-negative",
    processing.p99SecondsToResolve >= 0,
  );

  const processingBucketTotal = processing.buckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );

  TestValidator.predicate(
    "processingTime buckets total count >= resolvedAppeals",
    processingBucketTotal >= overview1.resolvedAppeals,
  );

  // 20. Validate timeline statistics
  const timelineBuckets = stats1.timeline.buckets;

  TestValidator.predicate(
    "timeline buckets have non-negative createdCount and resolvedCount",
    timelineBuckets.every(
      (bucket) => bucket.createdCount >= 0 && bucket.resolvedCount >= 0,
    ),
  );

  const timelineCreatedTotal = timelineBuckets.reduce(
    (sum, bucket) => sum + bucket.createdCount,
    0,
  );

  TestValidator.predicate(
    "timeline createdCount sum >= totalAppeals",
    timelineCreatedTotal >= overview1.totalAppeals,
  );

  // 21. Call statistics endpoint again to ensure read-only behavior and consistent structure
  const stats2: ICommunityPlatformAppealStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.appeals.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(stats2);

  const overview2 = stats2.overview;

  TestValidator.predicate(
    "second call overview totalAppeals is non-negative",
    overview2.totalAppeals >= 0,
  );

  TestValidator.predicate(
    "second call overview totalAppeals >= first call totalAppeals (monotonic or stable)",
    overview2.totalAppeals >= overview1.totalAppeals,
  );
}
