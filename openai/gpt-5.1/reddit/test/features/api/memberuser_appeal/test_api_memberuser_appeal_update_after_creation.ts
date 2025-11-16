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

export async function test_api_memberuser_appeal_update_after_creation(
  connection: api.IConnection,
) {
  /**
   * Validate that a member user can create an appeal for their own report and
   * then update it.
   *
   * Steps:
   *
   * 1. Join as a new memberUser to obtain authenticated context.
   * 2. Create a new report via memberUser reports.create using
   *    ICommunityPlatformReport.ICreate.
   * 3. Create an appeal for that report via reports.appeals.create using
   *    ICommunityPlatformAppeal.ICreate.
   * 4. Update that appeal via reports.appeals.update using
   *    ICommunityPlatformAppeal.IUpdate.
   * 5. Assert that the updated appeal reflects changes while preserving
   *    identifiers and report linkage.
   */

  // 1. Register a new member user (join) to get authenticated session & tokens
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
    ip: null,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new report as this member user
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // Sanity check: created report should have the same reason category id and reporter_type
  TestValidator.equals(
    "created report has expected reporter_type",
    report.reporter_type,
    reportBody.reporter_type,
  );
  TestValidator.equals(
    "created report has expected reason category id",
    report.reason_category?.id ?? reportBody.report_reason_category_id,
    reportBody.report_reason_category_id,
  );

  // 3. Create an appeal for this report
  const createAppealBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: createAppealBody,
      },
    );
  typia.assert(createdAppeal);

  // 4. Update the appeal with new values
  const updatedSummary = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDetails = RandomGenerator.content({ paragraphs: 3 });
  const updatedOutcome = RandomGenerator.paragraph({ sentences: 1 });

  const updateAppealBody = {
    // keep same scope but change summary/details and provide an outcome
    appeal_scope: createdAppeal.appeal_scope,
    reason_summary: updatedSummary,
    details: updatedDetails,
    outcome_summary: updatedOutcome,
    resolved_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.update(
      connection,
      {
        reportId: report.id,
        appealId: createdAppeal.id,
        body: updateAppealBody,
      },
    );
  typia.assert(updatedAppeal);

  // 5. Assertions on updated appeal

  // ID should be unchanged
  TestValidator.equals(
    "appeal id remains unchanged after update",
    updatedAppeal.id,
    createdAppeal.id,
  );

  // Report association should be unchanged
  TestValidator.equals(
    "appeal remains associated with the same report",
    updatedAppeal.report.id,
    createdAppeal.report.id,
  );

  // Business field changes
  TestValidator.equals(
    "updated appeal has new reason_summary",
    updatedAppeal.reason_summary,
    updateAppealBody.reason_summary,
  );
  TestValidator.equals(
    "updated appeal has new details",
    updatedAppeal.details,
    updateAppealBody.details,
  );
  TestValidator.equals(
    "updated appeal has new outcome_summary",
    updatedAppeal.outcome_summary,
    updateAppealBody.outcome_summary,
  );

  // Status or scope may or may not change depending on backend rules, but scope
  // should at least stay consistent with what we sent when we specified it.
  TestValidator.equals(
    "appeal_scope remains consistent",
    updatedAppeal.appeal_scope,
    updateAppealBody.appeal_scope ?? createdAppeal.appeal_scope,
  );

  // Temporal consistency: updated_at should be >= created_at and
  // should not regress compared to previous updated_at.
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(updatedAppeal.updated_at).getTime() >=
      new Date(updatedAppeal.created_at).getTime(),
  );

  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    new Date(updatedAppeal.updated_at).getTime() >=
      new Date(createdAppeal.updated_at).getTime(),
  );
}
