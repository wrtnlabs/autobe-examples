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
import type { ICommunityPlatformModerationOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationOverviewDashboard";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_moderation_overview_dashboard_with_minimal_data(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auto-authenticate as platformAdmin)
  const platformAdminUsername = RandomGenerator.alphabets(12);
  const platformAdminEmail = `admin+${RandomGenerator.alphabets(8)}@example.com`;
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: platformAdminUsername,
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        // ip is optional (string | undefined); omit to avoid null assignment
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 2. Create a single visibility level to be used when creating a community
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public (Test)",
          description: "Public visibility level for e2e testing",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Register a member user (auto-authenticate as memberUser)
  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail = `user+${RandomGenerator.alphabets(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberId = memberJoin.id;

  // 4. As memberUser, create a minimal community using the visibility level
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(6)}`;
  const communityTitle = "E2E Test Community";

  const createdCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: "Minimal community for moderation overview e2e test",
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(createdCommunity);

  // 5. As memberUser, create exactly one report with minimal fields
  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          // Use a random UUID for report_reason_category_id; referential
          // integrity to an actual category is outside the scope of this test.
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: createdCommunity.id,
          severity: null,
          description: null,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 6. Switch back to platformAdmin using login with stored credentials
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 7. As platformAdmin, create one moderation queue scoped to the community
  const moderationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: createdCommunity.id,
          name: "Default Test Queue",
          queue_type: "community_default",
          status: "active",
          description: "E2E test moderation queue for minimal dashboard data",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(moderationQueue);

  // 8. Optionally, create a simple user sanction for the member user
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const userSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberId,
          community_id: null,
          sanction_type: "warning",
          status: "active",
          effective_from: effectiveFrom,
          effective_until: effectiveUntil,
          reason_summary: "Test sanction for moderation overview dashboard",
          notes_internal: "E2E test - can be safely ignored.",
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(userSanction);

  // 9. Fetch the moderation overview dashboard as platformAdmin
  const dashboard =
    await api.functional.communityPlatform.platformAdmin.dashboard.moderationOverview.index(
      connection,
    );
  typia.assert<ICommunityPlatformModerationOverviewDashboard>(dashboard);

  // --- Assertions on aggregated dashboard data ---

  // Ensure core sections are present (object and arrays)
  TestValidator.predicate(
    "reportOverview must be a non-null object",
    dashboard.reportOverview !== null && dashboard.reportOverview !== undefined,
  );
  TestValidator.predicate(
    "queueOverview must be a non-null object",
    dashboard.queueOverview !== null && dashboard.queueOverview !== undefined,
  );
  TestValidator.predicate(
    "recentSanctions must be an array",
    Array.isArray(dashboard.recentSanctions),
  );
  TestValidator.predicate(
    "recentModerationActions must be an array",
    Array.isArray(dashboard.recentModerationActions),
  );
  TestValidator.predicate(
    "recentAuditEvents must be an array",
    Array.isArray(dashboard.recentAuditEvents),
  );

  const reportOverview = dashboard.reportOverview;
  const queueOverview = dashboard.queueOverview;

  // Report overview numeric constraints
  TestValidator.predicate(
    "totalOpenReports must be >= 1 after creating one report",
    reportOverview.totalOpenReports >= 1,
  );
  TestValidator.predicate(
    "totalResolvedReports must be >= 0",
    reportOverview.totalResolvedReports >= 0,
  );

  TestValidator.predicate(
    "byStatus must be an array",
    Array.isArray(reportOverview.byStatus),
  );
  TestValidator.predicate(
    "bySeverity must be an array (can be empty)",
    Array.isArray(reportOverview.bySeverity),
  );

  // Each status/severity bucket must have non-negative counts
  for (const bucket of reportOverview.byStatus) {
    TestValidator.predicate(
      "status bucket count must be non-negative",
      bucket.count >= 0,
    );
  }
  for (const bucket of reportOverview.bySeverity) {
    TestValidator.predicate(
      "severity bucket count must be non-negative",
      bucket.count >= 0,
    );
  }

  // Queue overview constraints
  TestValidator.predicate(
    "totalQueuedItems must be >= 0",
    queueOverview.totalQueuedItems >= 0,
  );
  TestValidator.predicate(
    "queues must be an array",
    Array.isArray(queueOverview.queues),
  );

  for (const qb of queueOverview.queues) {
    TestValidator.predicate(
      "queue bucket queuedItemCount must be non-negative",
      qb.queuedItemCount >= 0,
    );
  }

  // We cannot guarantee that our specific queue appears in the buckets, but we
  // can at least ensure that, when present, queueId and queueName are
  // non-empty strings.
  for (const qb of queueOverview.queues) {
    TestValidator.predicate(
      "queueId must be a non-empty string",
      typeof qb.queueId === "string" && qb.queueId.length > 0,
    );
    TestValidator.predicate(
      "queueName must be a non-empty string",
      typeof qb.queueName === "string" && qb.queueName.length > 0,
    );
  }

  // Recent sanctions - structure sanity checks (content is backend dependent).
  for (const sanction of dashboard.recentSanctions) {
    TestValidator.predicate(
      "recent sanction sanctionId must be non-empty",
      typeof sanction.sanctionId === "string" && sanction.sanctionId.length > 0,
    );
    TestValidator.predicate(
      "recent sanction userId must be non-empty",
      typeof sanction.userId === "string" && sanction.userId.length > 0,
    );
    TestValidator.predicate(
      "recent sanction createdAt must be non-empty string",
      typeof sanction.createdAt === "string" && sanction.createdAt.length > 0,
    );
  }

  // Recent moderation actions structure sanity
  for (const action of dashboard.recentModerationActions) {
    TestValidator.predicate(
      "recent moderation action actionId must be non-empty",
      typeof action.actionId === "string" && action.actionId.length > 0,
    );
    TestValidator.predicate(
      "recent moderation action createdAt must be non-empty",
      typeof action.createdAt === "string" && action.createdAt.length > 0,
    );
  }

  // Recent audit events structure sanity
  for (const evt of dashboard.recentAuditEvents) {
    TestValidator.predicate(
      "recent audit event eventId must be non-empty",
      typeof evt.eventId === "string" && evt.eventId.length > 0,
    );
    TestValidator.predicate(
      "recent audit event occurredAt must be non-empty",
      typeof evt.occurredAt === "string" && evt.occurredAt.length > 0,
    );
  }
}
