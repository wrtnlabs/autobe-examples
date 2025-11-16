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

export async function test_api_appeal_statistics_filtered_by_status_and_community(
  connection: api.IConnection,
) {
  // 1. Register platform admin (this will also authenticate and set Authorization header on connection).
  const platformAdminHref = "https://admin.example.com/join" as string &
    tags.Format<"uri">;
  const platformAdminReferrer = "https://admin.example.com/landing" as string &
    tags.Format<"uri">;

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: platformAdminHref,
    referrer: platformAdminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin.
  const visibilityCode = `public-${RandomGenerator.alphabets(5)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user who will be the reporting and sanctioned user.
  const memberHref = "https://app.example.com/signup" as string &
    tags.Format<"uri">;
  const memberReferrer = "https://app.example.com/landing" as string &
    tags.Format<"uri">;

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: "127.0.0.1",
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 4. Login as member user to ensure context and then create two communities.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  const communityAIdentifier = `community-a-${RandomGenerator.alphabets(5)}`;
  const communityBIdentifier = `community-b-${RandomGenerator.alphabets(5)}`;

  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: "Community A",
    description: "First test community",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);

  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: "Community B",
    description: "Second test community",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // 5. As member user, create reports for both communities.
  const reportReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const reportABody1 = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: communityA.id,
    severity: "high",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA1: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportABody1 },
    );
  typia.assert(reportA1);

  const reportABody2 = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: communityA.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA2: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportABody2 },
    );
  typia.assert(reportA2);

  const reportBBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: communityB.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportB: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBBody },
    );
  typia.assert(reportB);

  // 6. Register and login as community moderator.
  const moderatorHref = "https://mod.example.com/join" as string &
    tags.Format<"uri">;
  const moderatorReferrer = "https://mod.example.com/landing" as string &
    tags.Format<"uri">;

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorPassw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorJoin);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  // Create moderation actions for both communities’ reports.
  const moderationActionABody1 = {
    community_id: communityA.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Violation in community A report 1",
    notes_internal: "Automated e2e test moderation action A1",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionA1: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionABody1 },
    );
  typia.assert(moderationActionA1);

  const moderationActionABody2 = {
    community_id: communityA.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Violation in community A report 2",
    notes_internal: "Automated e2e test moderation action A2",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionA2: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionABody2 },
    );
  typia.assert(moderationActionA2);

  const moderationActionBBody = {
    community_id: communityB.id,
    action_type: "lock_content",
    target_scope: "post",
    reason_summary: "Violation in community B report",
    notes_internal: "Automated e2e test moderation action B",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionB: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionBBody },
    );
  typia.assert(moderationActionB);

  // 7. Switch back to platformAdmin account via login and create user sanctions.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: platformAdminHref,
    referrer: platformAdminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const now = new Date();
  const nowIso = now.toISOString();
  const laterIso = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const sanctionABody1 = {
    community_platform_report_id: reportA1.id,
    sanctioned_memberuser_id: memberUser.id,
    community_id: communityA.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: nowIso,
    effective_until: laterIso,
    reason_summary: "Sanction A1",
    notes_internal: "E2E sanction for community A report 1",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanctionA1: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionABody1 },
    );
  typia.assert(sanctionA1);

  const sanctionABody2 = {
    community_platform_report_id: reportA2.id,
    sanctioned_memberuser_id: memberUser.id,
    community_id: communityA.id,
    sanction_type: "warning",
    status: "active",
    effective_from: nowIso,
    effective_until: laterIso,
    reason_summary: "Sanction A2",
    notes_internal: "E2E sanction for community A report 2",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanctionA2: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionABody2 },
    );
  typia.assert(sanctionA2);

  const sanctionBBody = {
    community_platform_report_id: reportB.id,
    sanctioned_memberuser_id: memberUser.id,
    community_id: communityB.id,
    sanction_type: "temporary_platform_ban",
    status: "scheduled",
    effective_from: nowIso,
    effective_until: laterIso,
    reason_summary: "Sanction B",
    notes_internal: "E2E sanction for community B report",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanctionB: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionBBody },
    );
  typia.assert(sanctionB);

  // 8. Switch to member user again and create appeals.
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAgain);

  const appealScope = "sanction";

  const createAppeal = async (
    reasonPrefix: string,
  ): Promise<ICommunityPlatformAppeal> => {
    const body = {
      appeal_scope: appealScope,
      reason_summary: `${reasonPrefix} summary`,
      details: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ICommunityPlatformAppeal.ICreate;

    const appeal: ICommunityPlatformAppeal =
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        { body },
      );
    typia.assert(appeal);
    return appeal;
  };

  const appealA1: ICommunityPlatformAppeal = await createAppeal("Appeal A1");
  const appealA2: ICommunityPlatformAppeal = await createAppeal("Appeal A2");
  const appealB1: ICommunityPlatformAppeal = await createAppeal("Appeal B1");

  const allAppeals: ICommunityPlatformAppeal[] = [appealA1, appealA2, appealB1];

  // Use the status of appealA1 as the target filter status to ensure at least one match.
  const targetStatus: string = appealA1.appeal_status;

  // Determine earliest and latest created_at timestamps from all appeals to build a wide-enough window.
  const createdTimes = allAppeals.map((a) => new Date(a.created_at).getTime());
  const earliestCreated = new Date(Math.min(...createdTimes));
  const latestCreated = new Date(Math.max(...createdTimes));

  const startWindow = new Date(earliestCreated.getTime() - 60 * 1000);
  const endWindow = new Date(latestCreated.getTime() + 60 * 1000);

  const statsRequestBody = {
    start: startWindow.toISOString(),
    end: endWindow.toISOString(),
    communityIds: [communityA.id],
    statuses: [targetStatus],
  } satisfies ICommunityPlatformAppealStatistics.IRequest;

  // 9. Ensure we are platform admin before calling statistics API.
  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const stats: ICommunityPlatformAppealStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.appeals.index(
      connection,
      { body: statsRequestBody },
    );
  typia.assert(stats);

  // 10. Basic overview sanity checks.
  TestValidator.predicate(
    "totalAppeals should be non-negative",
    stats.overview.totalAppeals >= 0,
  );
  TestValidator.predicate(
    "openAppeals should be non-negative",
    stats.overview.openAppeals >= 0,
  );
  TestValidator.predicate(
    "resolvedAppeals should be non-negative",
    stats.overview.resolvedAppeals >= 0,
  );
  TestValidator.predicate(
    "backlogSize should be non-negative",
    stats.overview.backlogSize >= 0,
  );
  TestValidator.predicate(
    "approvalRate between 0 and 1",
    stats.overview.approvalRate >= 0 && stats.overview.approvalRate <= 1,
  );
  TestValidator.predicate(
    "rejectionRate between 0 and 1",
    stats.overview.rejectionRate >= 0 && stats.overview.rejectionRate <= 1,
  );

  // 11. Status breakdown: if there are any buckets, one of them should match targetStatus.
  const statusBuckets = stats.statusBreakdown.byStatus;
  if (statusBuckets.length > 0) {
    const hasTargetBucket = statusBuckets.some(
      (bucket) => bucket.status === targetStatus,
    );
    TestValidator.predicate(
      "statusBreakdown should include a bucket for the filtered status when buckets exist",
      hasTargetBucket,
    );

    const totalStatusCount = statusBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0,
    );
    TestValidator.predicate(
      "sum of status bucket counts should not exceed totalAppeals",
      totalStatusCount <= stats.overview.totalAppeals,
    );
  }

  // 12. Community breakdown: when filtered to communityA, Community B must not appear.
  const communityBuckets = stats.communityBreakdown.byCommunity;
  if (communityBuckets.length > 0) {
    const hasCommunityA = communityBuckets.some(
      (bucket) => bucket.communityId === communityA.id,
    );
    TestValidator.predicate(
      "communityBreakdown should include Community A when buckets exist",
      hasCommunityA,
    );

    const hasCommunityB = communityBuckets.some(
      (bucket) => bucket.communityId === communityB.id,
    );
    TestValidator.equals(
      "communityBreakdown should not include Community B when filtered to communityA.id",
      hasCommunityB,
      false,
    );

    const totalCommunityCount = communityBuckets.reduce(
      (sum, bucket) => sum + bucket.appealCount,
      0,
    );
    TestValidator.predicate(
      "sum of community bucket counts should not exceed totalAppeals",
      totalCommunityCount <= stats.overview.totalAppeals,
    );
  }

  // 13. Sanction type breakdown: counts should not exceed totalAppeals.
  const sanctionBuckets = stats.sanctionTypeBreakdown.bySanctionType;
  const totalSanctionAppeals = sanctionBuckets.reduce(
    (sum, bucket) => sum + bucket.appealCount,
    0,
  );
  TestValidator.predicate(
    "sum of sanctionTypeBreakdown counts should not exceed totalAppeals",
    totalSanctionAppeals <= stats.overview.totalAppeals,
  );

  // 14. Processing time: counts should not exceed totalAppeals.
  const processingBuckets = stats.processingTime.buckets;
  const totalProcessingAppeals = processingBuckets.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  TestValidator.predicate(
    "sum of processingTime bucket counts should not exceed totalAppeals",
    totalProcessingAppeals <= stats.overview.totalAppeals,
  );

  // 15. Timeline: created/resolved counts should be non-negative and consistent.
  const timelineBuckets = stats.timeline.buckets;
  const totalCreatedInTimeline = timelineBuckets.reduce(
    (sum, bucket) => sum + bucket.createdCount,
    0,
  );
  const totalResolvedInTimeline = timelineBuckets.reduce(
    (sum, bucket) => sum + bucket.resolvedCount,
    0,
  );

  TestValidator.predicate(
    "total createdCount in timeline should be non-negative",
    totalCreatedInTimeline >= 0,
  );
  TestValidator.predicate(
    "total resolvedCount in timeline should be non-negative",
    totalResolvedInTimeline >= 0,
  );
  TestValidator.predicate(
    "total resolvedCount in timeline should not exceed total createdCount",
    totalResolvedInTimeline <= totalCreatedInTimeline,
  );
}
