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
 * Exercise the platform admin moderation overview dashboard with realistic
 * platform-wide activity.
 *
 * This test simulates a multi-actor moderation scenario involving a platform
 * administrator, a regular member user, and a community moderator. It wires up
 * key moderation-related entities before reading the consolidated dashboard:
 *
 * 1. Platform admin joins and defines a community visibility level.
 * 2. Member user joins and creates a community using that visibility level.
 * 3. Member user files a report within the community.
 * 4. Community moderator joins and records a moderation action.
 * 5. Platform admin creates a user sanction referencing the report and member.
 * 6. Platform admin defines a moderation queue scoped to the community.
 * 7. Platform admin creates a community membership for the member user.
 * 8. Platform admin fetches the moderation overview dashboard and we validate its
 *    type correctness and basic logical consistency (non-negative counts,
 *    arrays present, and sane bucket structures), without asserting exact
 *    aggregation values.
 */
export async function test_api_moderation_overview_dashboard_with_platform_wide_activity(
  connection: api.IConnection,
) {
  // 1) Platform admin registration (join) and implicit authentication
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2) Create a community visibility level as platformAdmin
  const visibilityCodeBase = "public";
  const visibilityCode = `${visibilityCodeBase}-${RandomGenerator.alphaNumeric(6)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description:
      "Publicly discoverable community visibility level used for testing.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3) Member user registration and authentication
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberUserEmail,
    password: memberUserPassword,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4) Member user creates a community using the created visibility level
  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Moderation Community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5) Member user creates a report in the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 6) Community moderator registration and authentication
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://moderation.example.com/signup",
    referrer: "https://moderation.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7) Community moderator creates a moderation action (not directly bound to a report in ICreate)
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Removed content due to policy violation in test.",
    notes_internal: "Test moderation action created by e2e test.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 8) Switch back to platform admin context via login
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 9) Create a user sanction referencing the report and member user
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + oneDayMs).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Test sanction for dashboard aggregation.",
    notes_internal: "Created by e2e test to populate recent sanctions.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: userSanctionCreateBody,
      },
    );
  typia.assert(userSanction);

  // 10) Create a moderation queue scoped to the community
  const moderationQueueCreateBody = {
    community_id: community.id,
    name: `Default Queue for ${community.identifier}`,
    queue_type: "community_default",
    status: "active",
    description: "Default moderation queue created by e2e test.",
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: moderationQueueCreateBody,
      },
    );
  typia.assert(moderationQueue);

  // 11) Create a community membership for the member user via platform admin
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 12) Fetch the moderation overview dashboard as platform admin
  const dashboard: ICommunityPlatformModerationOverviewDashboard =
    await api.functional.communityPlatform.platformAdmin.dashboard.moderationOverview.index(
      connection,
    );
  typia.assert(dashboard);

  // 13) Basic logical validations on the dashboard snapshot
  const reportOverview = dashboard.reportOverview;
  const queueOverview = dashboard.queueOverview;
  const recentSanctions = dashboard.recentSanctions;
  const recentModerationActions = dashboard.recentModerationActions;
  const recentAuditEvents = dashboard.recentAuditEvents;

  // Report overview counts should be non-negative
  TestValidator.predicate(
    "totalOpenReports is non-negative",
    reportOverview.totalOpenReports >= 0,
  );
  TestValidator.predicate(
    "totalResolvedReports is non-negative",
    reportOverview.totalResolvedReports >= 0,
  );

  // Each status bucket count is non-negative
  for (const bucket of reportOverview.byStatus) {
    TestValidator.predicate(
      `status bucket count for ${bucket.status} is non-negative`,
      bucket.count >= 0,
    );
  }

  // Each severity bucket count is non-negative
  for (const bucket of reportOverview.bySeverity) {
    TestValidator.predicate(
      `severity bucket count for ${bucket.severity} is non-negative`,
      bucket.count >= 0,
    );
  }

  // Queue overview totals and buckets should be non-negative
  TestValidator.predicate(
    "totalQueuedItems is non-negative",
    queueOverview.totalQueuedItems >= 0,
  );

  for (const queueBucket of queueOverview.queues) {
    TestValidator.predicate(
      `queue bucket queuedItemCount for ${queueBucket.queueName} is non-negative`,
      queueBucket.queuedItemCount >= 0,
    );
  }

  // recentSanctions array should be a valid collection; if non-empty, createdAt timestamps should be well-formed (already enforced by typia)
  TestValidator.predicate(
    "recentSanctions length is non-negative",
    recentSanctions.length >= 0,
  );

  for (const sanction of recentSanctions) {
    const createdDate = new Date(sanction.createdAt);
    TestValidator.predicate(
      "recent sanction createdAt is a valid date",
      !Number.isNaN(createdDate.getTime()),
    );
  }

  // recentModerationActions basic checks
  TestValidator.predicate(
    "recentModerationActions length is non-negative",
    recentModerationActions.length >= 0,
  );

  for (const action of recentModerationActions) {
    const createdDate = new Date(action.createdAt);
    TestValidator.predicate(
      "recent moderation action createdAt is a valid date",
      !Number.isNaN(createdDate.getTime()),
    );
    TestValidator.predicate(
      "recent moderation action actorRole is non-empty",
      action.actorRole.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action targetType is non-empty",
      action.targetType.length > 0,
    );
  }

  // recentAuditEvents basic checks
  TestValidator.predicate(
    "recentAuditEvents length is non-negative",
    recentAuditEvents.length >= 0,
  );

  for (const event of recentAuditEvents) {
    const occurredDate = new Date(event.occurredAt);
    TestValidator.predicate(
      "recent audit event occurredAt is a valid date",
      !Number.isNaN(occurredDate.getTime()),
    );
    TestValidator.predicate(
      "recent audit event category is non-empty",
      event.category.length > 0,
    );
    TestValidator.predicate(
      "recent audit event severity is non-empty",
      event.severity.length > 0,
    );
  }
}
