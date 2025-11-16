import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationOverviewDashboard";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_overview_dashboard_security_and_scope(
  connection: api.IConnection,
) {
  // 1. Register core actors: platformAdmin, memberUser, communityModerator
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformPassword = "platform-password-123";
  const memberPassword = "member-password-123";
  const moderatorPassword = "moderator-password-123";

  // platformAdmin join (also authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminAuth);

  // memberUser join (also authenticates as member)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.2",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuth);

  // communityModerator join (also authenticates as moderator)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.3",
    href: "https://mod.example.com/signup",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorAuth);

  // 2. Log back in explicitly for each actor to confirm login flows work
  // and to simplify later re-auth steps.

  // platformAdmin login
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoginAuth,
  );

  // memberUser login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: "127.0.0.2",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuth);

  // communityModerator login
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.3",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginAuth,
  );

  // 3. As platformAdmin, create a visibility level.
  // Ensure platformAdmin is the active actor by logging in again.
  const platformAdminReLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminReLoginAuth,
  );

  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Visibility level for publicly discoverable communities.",
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
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Switch to memberUser: login as member again to ensure member token.
  const memberReLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberReLoginAuth);

  // 5. As memberUser, create a community.
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Security Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. As memberUser, create a report tied to this community.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  TestValidator.equals(
    "report community_id should match created community",
    report.context_community?.id ?? null,
    community.id,
  );

  // 7. Switch back to platformAdmin and call the dashboard.
  const platformAdminFinalAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminFinalAuth,
  );

  const dashboard: ICommunityPlatformModerationOverviewDashboard =
    await api.functional.communityPlatform.platformAdmin.dashboard.moderationOverview.index(
      connection,
    );
  typia.assert<ICommunityPlatformModerationOverviewDashboard>(dashboard);

  // Basic structural and business sanity checks on dashboard content.
  TestValidator.predicate(
    "totalOpenReports should be non-negative",
    dashboard.reportOverview.totalOpenReports >= 0,
  );
  TestValidator.predicate(
    "totalResolvedReports should be non-negative",
    dashboard.reportOverview.totalResolvedReports >= 0,
  );
  TestValidator.predicate(
    "queueOverview.totalQueuedItems should be non-negative",
    dashboard.queueOverview.totalQueuedItems >= 0,
  );

  const sumQueueItems = dashboard.queueOverview.queues.reduce(
    (sum, q) => sum + q.queuedItemCount,
    0,
  );
  TestValidator.predicate(
    "totalQueuedItems should be at least the sum of bucket counts",
    dashboard.queueOverview.totalQueuedItems >= sumQueueItems,
  );

  if (dashboard.reportOverview.byStatus.length > 0) {
    TestValidator.predicate(
      "each report status bucket should have non-empty status and non-negative count",
      dashboard.reportOverview.byStatus.every(
        (b) => b.status.length > 0 && b.count >= 0,
      ),
    );
  }

  if (dashboard.reportOverview.bySeverity.length > 0) {
    TestValidator.predicate(
      "each severity bucket should have non-empty severity and non-negative count",
      dashboard.reportOverview.bySeverity.every(
        (b) => b.severity.length > 0 && b.count >= 0,
      ),
    );
  }

  // 8. As memberUser, verify unauthorized access to platformAdmin dashboard.
  const memberUnauthorizedAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberUnauthorizedAuth,
  );

  await TestValidator.error(
    "member user should not access platformAdmin moderation overview",
    async () => {
      await api.functional.communityPlatform.platformAdmin.dashboard.moderationOverview.index(
        connection,
      );
    },
  );

  // 9. As communityModerator, verify unauthorized access to platformAdmin dashboard.
  const moderatorUnauthorizedAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorUnauthorizedAuth,
  );

  await TestValidator.error(
    "community moderator should not access platformAdmin moderation overview",
    async () => {
      await api.functional.communityPlatform.platformAdmin.dashboard.moderationOverview.index(
        connection,
      );
    },
  );
}
