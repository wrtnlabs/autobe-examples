import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate platform admin resolution of appeals and timestamp/status
 * consistency.
 *
 * Business workflow covered by this test:
 *
 * 1. A member user self-registers and becomes authenticated.
 * 2. The member user files a moderation report as the anchor entity.
 * 3. The same member user submits an appeal tied to that report.
 * 4. A platform administrator is registered and authenticated.
 * 5. The platform admin resolves the appeal via the admin-only update endpoint,
 *    moving it into a terminal-like status, providing an outcome summary and a
 *    resolved_at timestamp.
 * 6. The test asserts that the appeal status and resolution-related timestamps
 *    reflect the update, while immutable fields (like created_at) are preserved
 *    and updated_at advances.
 * 7. The platform admin performs a second update to simulate allowed edits after a
 *    terminal state (e.g., adjusting outcome_summary). The test checks that
 *    status remains stable while outcome_summary and timestamps update
 *    consistently.
 */
export async function test_api_platformadmin_appeal_status_resolution_and_timestamps(
  connection: api.IConnection,
) {
  // 1. Member user joins (self-registration)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/auth/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member user creates a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
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

  // 3. Member user creates an appeal for the report
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  const originalCreatedAt = createdAppeal.created_at;
  const originalUpdatedAt = createdAppeal.updated_at;

  // 4. Register a platform admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://app.example.com/admin/join",
    referrer: "https://app.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 5. Explicit login as platform admin to ensure actor context
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://app.example.com/admin/login",
    referrer: "https://app.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 6. Platform admin resolves the appeal with a terminal-like status
  const firstResolutionStatus = "accepted";
  const firstOutcomeSummary = RandomGenerator.paragraph({ sentences: 4 });
  const firstResolvedAt = new Date().toISOString();

  const firstUpdateBody = {
    appeal_status: firstResolutionStatus,
    outcome_summary: firstOutcomeSummary,
    resolved_at: firstResolvedAt,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const resolvedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.update(
      connection,
      {
        reportId: report.id,
        appealId: createdAppeal.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(resolvedAppeal);

  // 6.a Business logic assertions for first resolution
  TestValidator.equals(
    "appeal_status updated to terminal status",
    resolvedAppeal.appeal_status,
    firstResolutionStatus,
  );
  TestValidator.equals(
    "outcome_summary updated to admin-provided summary",
    resolvedAppeal.outcome_summary,
    firstOutcomeSummary,
  );
  TestValidator.equals(
    "resolved_at matches admin-provided resolution time",
    resolvedAppeal.resolved_at,
    firstResolvedAt,
  );
  TestValidator.equals(
    "created_at remains unchanged after resolution",
    resolvedAppeal.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at is advanced after resolution update",
    new Date(resolvedAppeal.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // 7. Second admin update: adjust outcome_summary while keeping status
  const secondOutcomeSummary = RandomGenerator.paragraph({ sentences: 5 });
  const secondResolvedAt = new Date().toISOString();

  const secondUpdateBody = {
    appeal_status: resolvedAppeal.appeal_status,
    outcome_summary: secondOutcomeSummary,
    resolved_at: secondResolvedAt,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAgainAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.update(
      connection,
      {
        reportId: report.id,
        appealId: createdAppeal.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedAgainAppeal);

  // 7.a Assertions about second update behavior
  TestValidator.equals(
    "appeal_status remains in the same terminal state after second update",
    updatedAgainAppeal.appeal_status,
    resolvedAppeal.appeal_status,
  );
  TestValidator.equals(
    "outcome_summary reflects the second admin edit",
    updatedAgainAppeal.outcome_summary,
    secondOutcomeSummary,
  );
  TestValidator.equals(
    "resolved_at reflects the latest admin-provided timestamp",
    updatedAgainAppeal.resolved_at,
    secondResolvedAt,
  );
  TestValidator.predicate(
    "updated_at advanced again on second update",
    new Date(updatedAgainAppeal.updated_at).getTime() >
      new Date(resolvedAppeal.updated_at).getTime(),
  );
}
