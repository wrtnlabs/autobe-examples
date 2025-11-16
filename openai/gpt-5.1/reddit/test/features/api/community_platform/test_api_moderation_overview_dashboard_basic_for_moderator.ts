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

export async function test_api_moderation_overview_dashboard_basic_for_moderator(
  connection: api.IConnection,
) {
  // 1. Register three actors: memberUser, communityModerator, platformAdmin
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUserAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberUserAuth);

  const moderatorJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinInput,
    });
  typia.assert(moderatorAuth);

  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuth);

  // 2. As platformAdmin: create a visibility level
  const visibilityInput = {
    code: `vis_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityInput,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As memberUser: login explicitly (though join may already set token) then create a community
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberUserLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberUserLoggedIn);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateInput = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateInput,
      },
    );
  typia.assert(community);

  // 4. As platformAdmin: login and create a community membership for the member user
  const platformAdminLoginInput = {
    identifier: platformAdminJoinInput.email,
    password: platformAdminJoinInput.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginInput,
    });
  typia.assert(platformAdminLoggedIn);

  const membershipCreateInput = {
    memberuser_id: memberUserAuth.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateInput,
      },
    );
  typia.assert(membership);

  // 5. As memberUser: login again and create a report
  const memberUserRelogged: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberUserRelogged);

  const reasonCategorySample: ICommunityPlatformReportReasonCategory.ISummary =
    typia.random<ICommunityPlatformReportReasonCategory.ISummary>();

  const reportCreateInput = {
    reporter_type: "member",
    report_reason_category_id: reasonCategorySample.id,
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateInput,
      },
    );
  typia.assert(report);

  // 6. As communityModerator: login and create a moderation action
  const moderatorLoginInput = {
    identifier: moderatorJoinInput.email,
    password: moderatorJoinInput.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;
  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginInput,
    });
  typia.assert(moderatorLoggedIn);

  const moderationActionCreateInput = {
    community_id: community.id,
    action_type: "no_action",
    target_scope: "post",
    reason_summary: "Initial triage completed, no immediate action taken",
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateInput,
      },
    );
  typia.assert(moderationAction);

  // 7. As platformAdmin: login again, create a user sanction and a moderation queue
  const platformAdminRelogged: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginInput,
    });
  typia.assert(platformAdminRelogged);

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const sanctionCreateInput = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUserAuth.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Test sanction from E2E scenario",
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;
  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateInput,
      },
    );
  typia.assert(sanction);

  const moderationQueueCreateInput = {
    community_id: community.id,
    name: `queue_${RandomGenerator.alphaNumeric(6)}`,
    queue_type: "community_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;
  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: moderationQueueCreateInput,
      },
    );
  typia.assert(moderationQueue);

  // 8. As communityModerator: ensure we are logged in, then call dashboard
  const moderatorRelogged: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginInput,
    });
  typia.assert(moderatorRelogged);

  const dashboard: ICommunityPlatformModerationOverviewDashboard =
    await api.functional.communityPlatform.communityModerator.dashboard.moderationOverview.index(
      connection,
    );
  typia.assert(dashboard);

  // Basic structural and sanity assertions
  TestValidator.predicate(
    "report overview total open reports is non-negative",
    dashboard.reportOverview.totalOpenReports >= 0,
  );
  TestValidator.predicate(
    "report overview total resolved reports is non-negative",
    dashboard.reportOverview.totalResolvedReports >= 0,
  );

  TestValidator.predicate(
    "report overview byStatus exists",
    Array.isArray(dashboard.reportOverview.byStatus),
  );
  TestValidator.predicate(
    "report overview bySeverity exists",
    Array.isArray(dashboard.reportOverview.bySeverity),
  );

  if (dashboard.reportOverview.byStatus.length > 0) {
    const bucket = dashboard.reportOverview.byStatus[0];
    TestValidator.predicate(
      "report status bucket has non-empty status",
      bucket.status.length > 0,
    );
    TestValidator.predicate(
      "report status bucket count is non-negative",
      bucket.count >= 0,
    );
  }

  if (dashboard.reportOverview.bySeverity.length > 0) {
    const bucket = dashboard.reportOverview.bySeverity[0];
    TestValidator.predicate(
      "report severity bucket has non-empty severity",
      bucket.severity.length > 0,
    );
    TestValidator.predicate(
      "report severity bucket count is non-negative",
      bucket.count >= 0,
    );
  }

  TestValidator.predicate(
    "queue overview totalQueuedItems is non-negative",
    dashboard.queueOverview.totalQueuedItems >= 0,
  );
  TestValidator.predicate(
    "queue overview queues exists",
    Array.isArray(dashboard.queueOverview.queues),
  );

  if (dashboard.queueOverview.queues.length > 0) {
    const queueBucket = dashboard.queueOverview.queues[0];
    TestValidator.predicate(
      "queue bucket has non-empty queueId",
      queueBucket.queueId.length > 0,
    );
    TestValidator.predicate(
      "queue bucket has non-empty queueName",
      queueBucket.queueName.length > 0,
    );
    TestValidator.predicate(
      "queue bucket queuedItemCount is non-negative",
      queueBucket.queuedItemCount >= 0,
    );
  }

  TestValidator.predicate(
    "recentSanctions array exists",
    Array.isArray(dashboard.recentSanctions),
  );
  if (dashboard.recentSanctions.length > 0) {
    const recentSanction = dashboard.recentSanctions[0];
    TestValidator.predicate(
      "recent sanction has non-empty sanctionId",
      recentSanction.sanctionId.length > 0,
    );
    TestValidator.predicate(
      "recent sanction has non-empty userId",
      recentSanction.userId.length > 0,
    );
    TestValidator.predicate(
      "recent sanction has non-empty username",
      recentSanction.username.length > 0,
    );
    TestValidator.predicate(
      "recent sanction has non-empty sanctionType",
      recentSanction.sanctionType.length > 0,
    );
    TestValidator.predicate(
      "recent sanction has non-empty reason",
      recentSanction.reason.length > 0,
    );
    TestValidator.predicate(
      "recent sanction createdAt looks like ISO string",
      recentSanction.createdAt.length > 0,
    );
  }

  TestValidator.predicate(
    "recentModerationActions array exists",
    Array.isArray(dashboard.recentModerationActions),
  );
  if (dashboard.recentModerationActions.length > 0) {
    const recentAction = dashboard.recentModerationActions[0];
    TestValidator.predicate(
      "recent moderation action has non-empty actionId",
      recentAction.actionId.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action has non-empty actorId",
      recentAction.actorId.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action has non-empty actorRole",
      recentAction.actorRole.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action has non-empty targetType",
      recentAction.targetType.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action has non-empty targetId",
      recentAction.targetId.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action has non-empty summary",
      recentAction.summary.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action createdAt looks like ISO string",
      recentAction.createdAt.length > 0,
    );
  }

  TestValidator.predicate(
    "recentAuditEvents array exists",
    Array.isArray(dashboard.recentAuditEvents),
  );
  if (dashboard.recentAuditEvents.length > 0) {
    const event = dashboard.recentAuditEvents[0];
    TestValidator.predicate(
      "recent audit event has non-empty eventId",
      event.eventId.length > 0,
    );
    TestValidator.predicate(
      "recent audit event has non-empty category",
      event.category.length > 0,
    );
    TestValidator.predicate(
      "recent audit event has non-empty severity",
      event.severity.length > 0,
    );
    TestValidator.predicate(
      "recent audit event has non-empty message",
      event.message.length > 0,
    );
    TestValidator.predicate(
      "recent audit event occurredAt looks like ISO string",
      event.occurredAt.length > 0,
    );
  }

  // 9. Authorization negative checks
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection must be denied for moderation overview dashboard",
    async () => {
      await api.functional.communityPlatform.communityModerator.dashboard.moderationOverview.index(
        unauthConnection,
      );
    },
  );

  // Switch to memberUser and ensure dashboard is denied
  const memberUserLoggedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberUserLoggedAgain);

  await TestValidator.error(
    "memberUser actor must be denied for moderation overview dashboard",
    async () => {
      await api.functional.communityPlatform.communityModerator.dashboard.moderationOverview.index(
        connection,
      );
    },
  );
}
