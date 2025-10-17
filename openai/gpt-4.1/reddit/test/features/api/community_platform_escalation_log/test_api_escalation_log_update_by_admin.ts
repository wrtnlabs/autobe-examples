import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test that an admin can fully update escalation log details including status
 * transitions, assignment, and resolution.
 *
 * Steps:
 *
 * 1. Admin joins/onboards. Save admin ID for assignment.
 * 2. Admin creates a report category (e.g. 'Abuse').
 * 3. Submit a user report as a member, referencing the new report category.
 * 4. Create an escalation log as the admin, referencing the member's report and
 *    with reason, status 'pending'.
 * 5. Test admin updates the escalation log's status to 'in_review' and assigns
 *    themselves (destination_admin_id).
 * 6. Test admin further updates the status to 'resolved' and sets a
 *    resolution_summary.
 * 7. Fetch the escalation log after each update and check the values are as
 *    expected.
 * 8. Edge: Try updating a non-existent escalationLogId and expect an error.
 * 9. Edge: Check audit/compliance by confirming updated_at/created_at fields
 *    update and remain consistent.
 */
export async function test_api_escalation_log_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins/onboards
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminJoinRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    },
  });
  typia.assert(adminJoinRes);
  const adminId = adminJoinRes.id;

  // 2. Create a report category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          allow_free_text: true,
        },
      },
    );
  typia.assert(reportCategory);

  // 3. Submit a member report (simulated as admin context, as regular member join is not available here)
  const reportedPostId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: reportedPostId,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      },
    },
  );
  typia.assert(report);

  // 4. Create an escalation log referencing the newly created report
  const escalationLog =
    await api.functional.communityPlatform.admin.escalationLogs.create(
      connection,
      {
        body: {
          initiator_id: adminId,
          report_id: report.id,
          escalation_reason: RandomGenerator.paragraph({ sentences: 2 }),
          destination_admin_id: null,
          status: "pending",
          resolution_summary: null,
        },
      },
    );
  typia.assert(escalationLog);

  // Save for audit/compliance checks
  const originalCreatedAt = escalationLog.created_at;
  let originalUpdatedAt = escalationLog.updated_at;

  // 5. Update to 'in_review' and assign destination_admin_id
  const inReviewUpdate =
    await api.functional.communityPlatform.admin.escalationLogs.update(
      connection,
      {
        escalationLogId: escalationLog.id,
        body: {
          destination_admin_id: adminId,
          status: "in_review",
          resolution_summary: null,
        },
      },
    );
  typia.assert(inReviewUpdate);
  TestValidator.equals(
    "status updated to in_review",
    inReviewUpdate.status,
    "in_review",
  );
  TestValidator.equals(
    "admin assigned",
    inReviewUpdate.destination_admin_id,
    adminId,
  );
  TestValidator.equals(
    "resolution_summary is null after first update",
    inReviewUpdate.resolution_summary,
    null,
  );
  TestValidator.notEquals(
    "updated_at modified after status transition",
    inReviewUpdate.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at does not change",
    inReviewUpdate.created_at,
    originalCreatedAt,
  );
  originalUpdatedAt = inReviewUpdate.updated_at;

  // 6. Update to 'resolved' and add resolution_summary
  const resolutionSummaryMock = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const resolvedUpdate =
    await api.functional.communityPlatform.admin.escalationLogs.update(
      connection,
      {
        escalationLogId: escalationLog.id,
        body: {
          status: "resolved",
          destination_admin_id: adminId,
          resolution_summary: resolutionSummaryMock,
        },
      },
    );
  typia.assert(resolvedUpdate);
  TestValidator.equals(
    "status updated to resolved",
    resolvedUpdate.status,
    "resolved",
  );
  TestValidator.equals(
    "destination_admin_id remains assigned",
    resolvedUpdate.destination_admin_id,
    adminId,
  );
  TestValidator.equals(
    "resolution_summary updated",
    resolvedUpdate.resolution_summary,
    resolutionSummaryMock,
  );
  TestValidator.notEquals(
    "updated_at advances after resolution",
    resolvedUpdate.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at still unchanged after resolution",
    resolvedUpdate.created_at,
    originalCreatedAt,
  );

  // 7. Edge case: update non-existent escalationLogId
  await TestValidator.error(
    "updating non-existent escalation log ID throws error",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.update(
        connection,
        {
          escalationLogId: typia.random<string & tags.Format<"uuid">>(),
          body: { status: "in_review" },
        },
      );
    },
  );
}
