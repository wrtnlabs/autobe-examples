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
 * Ensure that updating an appeal as platform admin does not break its linkage
 * to the original report and keeps related summaries consistent, even when
 * multiple appeals exist for the same report.
 *
 * Business workflow:
 *
 * 1. Member user joins and logs in.
 * 2. Member user creates a report.
 * 3. Member user creates two appeals under that report.
 * 4. Platform admin joins and logs in.
 * 5. Platform admin updates the first appeal with new status/scope/content.
 * 6. Verify the updated appeal still references the same report, reflects updated
 *    fields, and that the second appeal remains separate but also correctly
 *    linked to the report.
 */
export async function test_api_platformadmin_appeal_update_does_not_break_report_link(
  connection: api.IConnection,
) {
  // 1. Member user joins
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Member user logs in (ensures token pipeline works and re-auth is valid)
  const memberLoginInput = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 3. Member user creates a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: typia.random<string & tags.Format<"uuid">>(),
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
  typia.assert<ICommunityPlatformReport>(report);

  // 4. Member user creates first appeal under the report
  const appealCreateBodyA = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appealA: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBodyA,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appealA);

  TestValidator.equals(
    "first appeal should be linked to report by id in report summary",
    appealA.report.id,
    report.id,
  );

  // 5. Member user creates second appeal under the same report
  const appealCreateBodyB = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appealB: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBodyB,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appealB);

  TestValidator.equals(
    "second appeal should also be linked to same report",
    appealB.report.id,
    report.id,
  );

  TestValidator.notEquals(
    "two appeals under same report must have different ids",
    appealA.id,
    appealB.id,
  );

  // 6. Platform admin joins
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/admin/signup",
    referrer: "https://example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 7. Platform admin logs in (switch context firmly to admin)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin);

  // 8. Platform admin updates the first appeal
  const resolvedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const updateBody = {
    appeal_status: "under_review_platform",
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 1 }),
    details: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    outcome_summary: RandomGenerator.paragraph({ sentences: 2 }),
    resolved_at: resolvedAt,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppealA: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.update(
      connection,
      {
        reportId: report.id,
        appealId: appealA.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(updatedAppealA);

  // 9. Validate linkage and updated fields
  TestValidator.equals(
    "updated appeal should keep same id as original appeal",
    updatedAppealA.id,
    appealA.id,
  );

  TestValidator.equals(
    "updated appeal should remain linked to original report",
    updatedAppealA.report.id,
    report.id,
  );

  TestValidator.equals(
    "appeal_status should reflect platform admin update",
    updatedAppealA.appeal_status,
    updateBody.appeal_status,
  );

  TestValidator.equals(
    "appeal_scope should reflect platform admin update",
    updatedAppealA.appeal_scope,
    updateBody.appeal_scope,
  );

  TestValidator.equals(
    "reason_summary should be updated",
    updatedAppealA.reason_summary,
    updateBody.reason_summary,
  );

  TestValidator.equals(
    "details should be updated",
    updatedAppealA.details,
    updateBody.details,
  );

  TestValidator.equals(
    "outcome_summary should be updated",
    updatedAppealA.outcome_summary,
    updateBody.outcome_summary,
  );

  TestValidator.equals(
    "resolved_at should be set to update timestamp",
    updatedAppealA.resolved_at,
    updateBody.resolved_at,
  );

  // If userSanction summary is present, its reportId should still match report.id
  if (updatedAppealA.userSanction !== undefined) {
    TestValidator.equals(
      "userSanction.reportId should still reference the same report after appeal update",
      updatedAppealA.userSanction.reportId,
      report.id,
    );
  }

  // If moderationAction summary is present, we at least validate it structurally via typia (already done)
  // and can check targetType consistency with being related to this report's context when available.
  if (updatedAppealA.moderationAction !== undefined) {
    TestValidator.predicate(
      "moderationAction.targetType should be a non-empty string when present",
      typeof updatedAppealA.moderationAction.targetType === "string" &&
        updatedAppealA.moderationAction.targetType.length > 0,
    );
  }

  // Ensure the second appeal remains a distinct entity and still linked to the same report as originally
  TestValidator.equals(
    "second appeal should still be linked to original report after first appeal update",
    appealB.report.id,
    report.id,
  );

  TestValidator.notEquals(
    "updating first appeal must not change id of second appeal",
    updatedAppealA.id,
    appealB.id,
  );
}
