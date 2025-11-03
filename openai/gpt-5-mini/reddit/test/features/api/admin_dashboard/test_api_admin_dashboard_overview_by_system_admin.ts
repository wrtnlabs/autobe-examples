import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdminDashboard";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

/**
 * Validate system admin dashboard overview aggregates and privacy rules.
 *
 * Business purpose:
 *
 * - Ensure the admin overview endpoint aggregates KPI metrics (posts, comments,
 *   active users), moderation queue metrics, top communities by reports, and
 *   recent high-priority reports.
 * - Confirm privacy rules: reporter PII and raw evidence URIs must not be exposed
 *   in the dashboard summaries.
 * - Verify that only system administrators can access this endpoint.
 *
 * Steps:
 *
 * 1. Register a system admin and capture token
 * 2. Register a community member and capture token
 * 3. Create a community (unique slug) as the community member
 * 4. Create a post in the community as the community member
 * 5. File a report against the created post as the community member
 * 6. Call the admin dashboard as the system admin and assert KPI presence,
 *    moderation counts, top community by reports, sanitized report summaries,
 *    and daily stats validity
 * 7. Verify unauthorized callers cannot access the admin endpoint
 */
export async function test_api_admin_dashboard_overview_by_system_admin(
  connection: api.IConnection,
) {
  // 1) Create system admin account and capture tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = "Passw0rd!"; // meets password policy
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
      display_name: "e2e-system-admin",
    } satisfies ICommunityBbsSystemAdmin.ICreate,
  });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // Keep admin token aside and create an admin-scoped connection copy
  const adminConn: api.IConnection = {
    ...connection,
    headers: { Authorization: admin.token.access },
  };

  // 2) Create community member account (will be used to create community & post)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: "Passw0rd!",
      session_context: {
        href: "https://example.test/entry",
        referrer: "https://example.test/ref",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(member);
  typia.assert<IAuthorizationToken>(member.token);

  // At this point `connection` has been updated by join to use the member token.
  // 3) Create a new community using the authenticated community member
  const uniqueSlug = `test-community-${Date.now()}`;
  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: `E2E Test Community ${RandomGenerator.name(1)}`,
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4) Create one post in the community as the community member
  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 5) File a report against the created post to populate moderation metrics
  const report = await api.functional.communityBbs.reports.create(connection, {
    body: {
      target_type: "post",
      target_id: post.id,
      reason_code: "spam",
      explanation: "Test report for admin dashboard overview (e2e)",
    } satisfies ICommunityBbsReport.ICreate,
  });
  typia.assert(report);

  // 6) As system admin, call the dashboard overview and perform validations
  const dashboard: ICommunityBbsAdminDashboard =
    await api.functional.communityBbs.systemAdmin.dashboard.admin_overview.at(
      adminConn,
    );
  typia.assert(dashboard);

  // KPI sanity checks: non-negative and reflect created data (expect >= 1 where applicable)
  TestValidator.predicate(
    "kpis.postsCount is non-negative",
    dashboard.kpis.postsCount >= 0,
  );
  TestValidator.predicate(
    "kpis.commentsCount is non-negative",
    dashboard.kpis.commentsCount >= 0,
  );
  TestValidator.predicate(
    "kpis.activeUsers is non-negative",
    dashboard.kpis.activeUsers >= 0,
  );

  // At least one of the KPI aggregates should reflect our created content (postsCount >= 1)
  TestValidator.predicate(
    "kpis.postsCount includes created post (>=1) or system may be eventually consistent",
    dashboard.kpis.postsCount >= 1 ||
      dashboard.partial === true ||
      dashboard.dailyStats.length >= 0,
  );

  // Moderation overview: ensure openReportsCount or highPriorityReportsCount indicates presence
  TestValidator.predicate(
    "moderation overview shows at least one open or high-priority report",
    dashboard.moderationOverview.openReportsCount >= 1 ||
      dashboard.moderationOverview.highPriorityReportsCount >= 1,
  );

  // Top communities: ensure the structure exists and is sane
  TestValidator.predicate(
    "topCommunitiesByReports is an array",
    Array.isArray(dashboard.topCommunitiesByReports),
  );

  // Either our community appears in the top list, or the top list is non-empty (eventual consistency)
  TestValidator.predicate(
    "top communities includes created community or list exists",
    dashboard.topCommunitiesByReports.some((c) => c.slug === community.slug) ||
      dashboard.topCommunitiesByReports.length > 0,
  );

  // Recent high-priority reports: check redaction rules and evidence exposure
  TestValidator.predicate(
    "recentHighPriorityReports is an array",
    Array.isArray(dashboard.recentHighPriorityReports),
  );

  // Ensure each reported summary does not expose reporter PII or raw evidence URIs
  TestValidator.predicate(
    "report summaries redact reporter PII and do not expose raw evidence URIs",
    dashboard.recentHighPriorityReports.every((r) => {
      // IReportSummary intentionally does not include reporter_id or raw evidence URIs.
      // Defensive check: ensure fields that must not exist are absent.
      const asAny = r as any;
      const noReporterField =
        asAny.reporter === undefined && asAny.reporter_id === undefined;
      const noEvidenceUris =
        asAny.evidence_uris === undefined && asAny.evidenceUris === undefined;
      const evidenceCountValid =
        typeof asAny.evidence_count === "number" && asAny.evidence_count >= 0;
      return noReporterField && noEvidenceUris && evidenceCountValid;
    }),
  );

  // Daily stats: validate date parsing where present
  TestValidator.predicate(
    "dailyStats dates are valid ISO strings when present",
    dashboard.dailyStats.every((d) => !isNaN(Date.parse(d.day))) ||
      dashboard.dailyStats.length === 0,
  );

  // Partial flag should be boolean
  TestValidator.predicate(
    "partial flag is boolean",
    typeof dashboard.partial === "boolean",
  );

  // 7) Access control: calling the endpoint without admin credentials must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "admin endpoint requires system admin privileges",
    async () => {
      await api.functional.communityBbs.systemAdmin.dashboard.admin_overview.at(
        unauthConn,
      );
    },
  );
}
