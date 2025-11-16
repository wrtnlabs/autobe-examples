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
 * Validate that a platform administrator can update a member-submitted appeal
 * on a report, and that the updated appeal reflects the new status and outcome
 * while preserving its linkage to the original report and appellant.
 *
 * Business workflow covered:
 *
 * 1. A member user self-registers via /auth/memberUser/join (join also yields an
 *    authenticated context through tokens managed by the SDK).
 * 2. The member user creates a moderation report using POST
 *    /communityPlatform/memberUser/reports with a valid
 *    ICommunityPlatformReport.ICreate payload.
 * 3. The same member user files an appeal against that report using POST
 *    /communityPlatform/memberUser/reports/{reportId}/appeals with an
 *    ICommunityPlatformAppeal.ICreate payload.
 * 4. A platform administrator joins via /auth/platformAdmin/join and becomes
 *    authenticated as platformAdmin (SDK sets Authorization header).
 * 5. Using the platformAdmin context, the test calls PUT
 *    /communityPlatform/platformAdmin/reports/{reportId}/appeals/{appealId}
 *    with an ICommunityPlatformAppeal.IUpdate payload that updates
 *    `appeal_status`, `outcome_summary`, and `resolved_at`.
 * 6. The response ICommunityPlatformAppeal is asserted for type correctness and
 *    validated so that:
 *
 *    - Id remains the same appealId,
 *    - Report.id still equals the original report id,
 *    - AppellantMemberUser still references the original member user,
 *    - Appeal_status, outcome_summary, and resolved_at equal the update payload
 *         values.
 *
 * Note: No separate GET endpoint for the updated appeal is used in this test;
 * persistence is verified via the immediate PUT response only.
 */
export async function test_api_platformadmin_appeal_update_by_admin_after_member_creation(
  connection: api.IConnection,
) {
  // 1. Member user joins (register + authenticated context)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphabets(8),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Member user creates a moderation report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // Ensure the created report has an id and correct reporter_type
  TestValidator.predicate(
    "created report should have a UUID id",
    ((): boolean => {
      return typeof report.id === "string" && report.id.length > 0;
    })(),
  );
  TestValidator.equals(
    "created report reporter_type should match input",
    report.reporter_type,
    reportCreateBody.reporter_type,
  );

  // 3. Member user files an appeal against this report
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const initialAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(initialAppeal);

  // Basic linkage checks for the created appeal
  TestValidator.equals(
    "appeal.report.id should equal originating report id",
    initialAppeal.report.id,
    report.id,
  );
  if (initialAppeal.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "appellantMemberUser.id should equal member id when present",
      initialAppeal.appellantMemberUser.id,
      memberAuthorized.id,
    );
  }

  // 4. Platform admin joins (register + authenticated context)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphabets(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 5. Platform admin updates the appeal status, outcome summary, and resolved_at
  const updatedStatus = "accepted";
  const updatedOutcomeSummary = RandomGenerator.paragraph({ sentences: 4 });
  const resolvedAt = new Date().toISOString();

  const appealUpdateBody = {
    appeal_status: updatedStatus,
    outcome_summary: updatedOutcomeSummary,
    resolved_at: resolvedAt,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.update(
      connection,
      {
        reportId: report.id,
        appealId: initialAppeal.id,
        body: appealUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(updatedAppeal);

  // 6. Validate the updated appeal fields and linkages
  TestValidator.equals(
    "updated appeal id should remain the same",
    updatedAppeal.id,
    initialAppeal.id,
  );
  TestValidator.equals(
    "updated appeal's report.id should remain linked to original report",
    updatedAppeal.report.id,
    report.id,
  );
  if (updatedAppeal.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "updated appeal appellantMemberUser.id should still reference the member user",
      updatedAppeal.appellantMemberUser.id,
      memberAuthorized.id,
    );
  }
  TestValidator.equals(
    "appeal_status should reflect admin update",
    updatedAppeal.appeal_status,
    updatedStatus,
  );
  TestValidator.equals(
    "outcome_summary should reflect admin update",
    updatedAppeal.outcome_summary ?? null,
    updatedOutcomeSummary,
  );
  TestValidator.equals(
    "resolved_at should reflect admin update",
    updatedAppeal.resolved_at ?? null,
    resolvedAt,
  );
}
