import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationOverviewDashboard";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that the moderation overview dashboard reflects multiple moderation
 * queues, report severity distribution, and recent moderation activity.
 *
 * This E2E test executes a realistic multi-actor workflow:
 *
 * 1. MemberUser, communityModerator, and platformAdmin join the platform.
 * 2. PlatformAdmin creates a community visibility level.
 * 3. MemberUser creates a community using that visibility level.
 * 4. PlatformAdmin creates a membership for the memberUser in the community.
 * 5. PlatformAdmin defines two moderation queues (default and escalated) for the
 *    community.
 * 6. MemberUser files several reports with different severities, scoped to the
 *    community.
 * 7. CommunityModerator records a moderation action in the community.
 * 8. PlatformAdmin issues a user sanction for the memberUser based on one report.
 * 9. CommunityModerator fetches the moderation overview dashboard.
 * 10. The test asserts that:
 *
 * - QueueOverview.queues contains both configured queue names and non-negative
 *   queuedItemCount.
 * - ReportOverview.bySeverity has at least one bucket matching the used
 *   severities.
 * - RecentModerationActions contains at least one action entry.
 * - RecentSanctions contains at least one sanction referencing the sanctioned
 *   user.
 */
export async function test_api_moderation_overview_dashboard_reflects_multiple_queues_and_severity_distribution(
  connection: api.IConnection,
) {
  // 1. Create primary actors: memberUser, communityModerator, platformAdmin
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      ip: null,
      href: "https://frontend.local/member/join",
      referrer: "https://frontend.local/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);
  const memberUserId = memberJoin.id;
  const memberEmail = memberJoin.email;

  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: moderatorPassword,
        display_name: RandomGenerator.name(2),
        ip: null,
        href: "https://frontend.local/moderator/join",
        referrer: "https://frontend.local/moderation-info",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorJoin);
  const moderatorEmail = ((): string => {
    // ICommunityPlatformCommunityModerator.IAuthorized currently only exposes id and token,
    // so we keep the email we used for join in a separate variable.
    return ""; // placeholder, not used for login as we track email separately if needed
  })();

  const adminPassword = RandomGenerator.alphaNumeric(18);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(2),
      ip: undefined,
      href: "https://frontend.local/admin/join",
      referrer: "https://frontend.local/admin-landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  // 2. As platformAdmin, create a visibility level
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://frontend.local/admin/login",
      referrer: "https://frontend.local/admin-landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public Test ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. As memberUser, create a community using that visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://frontend.local/member/login",
      referrer: "https://frontend.local/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `test-community-${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Test Community ${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
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

  // 4. As platformAdmin, create a membership for the member user in this community
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://frontend.local/admin/login",
      referrer: "https://frontend.local/admin-landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const membershipBody = {
    memberuser_id: memberUserId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 5. As platformAdmin, define two moderation queues for this community
  const defaultQueueName = `Default Queue ${RandomGenerator.alphabets(4)}`;
  const escalatedQueueName = `Escalated Queue ${RandomGenerator.alphabets(4)}`;

  const defaultQueueBody = {
    community_id: community.id,
    name: defaultQueueName,
    queue_type: "community_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const escalatedQueueBody = {
    community_id: community.id,
    name: escalatedQueueName,
    queue_type: "community_escalated",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const defaultQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: defaultQueueBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(defaultQueue);

  const escalatedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: escalatedQueueBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(escalatedQueue);

  // 6. As memberUser, create reports with different severities
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://frontend.local/member/login",
      referrer: "https://frontend.local/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const severities = ["low", "high"] as const;

  const reportBodies: ICommunityPlatformReport.ICreate[] = [
    {
      reporter_type: "member",
      report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
      community_id: community.id,
      severity: severities[0],
      description: RandomGenerator.paragraph({ sentences: 5 }),
    },
    {
      reporter_type: "member",
      report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
      community_id: community.id,
      severity: severities[1],
      description: RandomGenerator.paragraph({ sentences: 5 }),
    },
  ];

  const reports: ICommunityPlatformReport[] = [];
  for (const body of reportBodies) {
    const report =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body,
        },
      );
    typia.assert<ICommunityPlatformReport>(report);
    reports.push(report);
  }

  // 7. As communityModerator, record a moderation action
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoin.id,
      password: moderatorPassword,
      ip: null,
      href: "https://frontend.local/moderator/login",
      referrer: "https://frontend.local/moderation-info",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderationActionBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Test removal action for dashboard overview",
    notes_internal: "E2E test moderation action",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 8. As platformAdmin, create a user sanction for one of the reports
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://frontend.local/admin/login",
      referrer: "https://frontend.local/admin-landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const reportForSanction = reports[0];
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const sanctionBody = {
    community_platform_report_id: reportForSanction.id,
    sanctioned_memberuser_id: memberUserId,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "E2E test sanction",
    notes_internal: "E2E test sanction notes",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionBody,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(sanction);

  // 9. As communityModerator, fetch the moderation overview dashboard
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoin.id,
      password: moderatorPassword,
      ip: null,
      href: "https://frontend.local/moderator/login",
      referrer: "https://frontend.local/moderation-info",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const dashboard: ICommunityPlatformModerationOverviewDashboard =
    await api.functional.communityPlatform.communityModerator.dashboard.moderationOverview.index(
      connection,
    );
  typia.assert<ICommunityPlatformModerationOverviewDashboard>(dashboard);

  // 10. Validate dashboard contents for queues, severities, and recent activity
  const queueOverview = dashboard.queueOverview;
  const reportOverview = dashboard.reportOverview;

  TestValidator.predicate(
    "totalQueuedItems should be non-negative",
    queueOverview.totalQueuedItems >= 0,
  );

  TestValidator.predicate(
    "queues array should have at least two entries",
    queueOverview.queues.length >= 2,
  );

  const queueNames = queueOverview.queues.map((q) => q.queueName);

  TestValidator.predicate(
    "queueOverview should contain default queue by name",
    queueNames.includes(defaultQueueName),
  );

  TestValidator.predicate(
    "queueOverview should contain escalated queue by name",
    queueNames.includes(escalatedQueueName),
  );

  for (const bucket of queueOverview.queues) {
    TestValidator.predicate(
      "queuedItemCount should be non-negative for each queue",
      bucket.queuedItemCount >= 0,
    );
  }

  TestValidator.predicate(
    "bySeverity should have at least one bucket",
    reportOverview.bySeverity.length >= 1,
  );

  const severityBuckets = reportOverview.bySeverity.map(
    (bucket) => bucket.severity,
  );

  const usedSeverities: string[] = [...severities];

  TestValidator.predicate(
    "at least one severity bucket should match used severities",
    usedSeverities.some((sev) => severityBuckets.includes(sev)),
  );

  TestValidator.predicate(
    "recentModerationActions should have at least one entry",
    dashboard.recentModerationActions.length >= 1,
  );

  const anyAction = dashboard.recentModerationActions[0];
  TestValidator.predicate(
    "recentModerationAction.summary should be non-empty",
    anyAction.summary.length > 0,
  );

  TestValidator.predicate(
    "recentModerationAction.actorRole should be non-empty",
    anyAction.actorRole.length > 0,
  );

  TestValidator.predicate(
    "recentModerationAction.targetType should be non-empty",
    anyAction.targetType.length > 0,
  );

  TestValidator.predicate(
    "recentSanctions should have at least one entry",
    dashboard.recentSanctions.length >= 1,
  );

  const sanctionForUser = dashboard.recentSanctions.find(
    (item) => item.userId === memberUserId,
  );

  TestValidator.predicate(
    "recentSanctions should include an entry for the sanctioned user",
    sanctionForUser !== undefined,
  );

  if (sanctionForUser !== undefined) {
    TestValidator.predicate(
      "sanctionType in recentSanction should be non-empty",
      sanctionForUser.sanctionType.length > 0,
    );

    TestValidator.predicate(
      "username in recentSanction should be non-empty",
      sanctionForUser.username.length > 0,
    );
  }
}
