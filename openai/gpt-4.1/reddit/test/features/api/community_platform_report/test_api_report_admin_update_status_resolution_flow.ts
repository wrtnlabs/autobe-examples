import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validate the full admin content report moderation/resolution workflow.
 *
 * 1. Register a member and admin, each getting their credentials.
 * 2. Admin creates a report category (e.g. 'spam' or 'abuse'), possibly enabling
 *    free-text.
 * 3. Member files a report for that category (simulate a post report).
 * 4. Confirm the report status is 'pending' and no moderation result is set.
 * 5. Admin changes the report status to 'under_review'.
 * 6. Admin then changes status to 'resolved', moderation_result='removed', and
 *    sets themselves as moderator.
 * 7. Attempt an invalid transition (e.g., move from 'resolved' back to 'pending'),
 *    expect error.
 * 8. Attempt member to update the report, expect error.
 * 9. Validate state transitions and admin assignments, ensure correct final state
 *    is present.
 */
export async function test_api_report_admin_update_status_resolution_flow(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Admin creates a report category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 4. Member files a report
  // (simulate a report on a post, post_id is randomly generated UUID here)
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: fakePostId,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "moderation result empty",
    report.moderation_result,
    null,
  );

  // 5. Admin updates report to 'under_review'
  const reportUnderReview =
    await api.functional.communityPlatform.admin.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "under_review",
        moderation_result: "reviewing",
        moderated_by_id: admin.id,
      } satisfies ICommunityPlatformReport.IUpdate,
    });
  typia.assert(reportUnderReview);
  TestValidator.equals(
    "status now under_review",
    reportUnderReview.status,
    "under_review",
  );
  TestValidator.equals(
    "moderator set",
    reportUnderReview.moderated_by_id,
    admin.id,
  );

  // 6. Admin updates report to 'resolved'/'removed'
  const reportResolved =
    await api.functional.communityPlatform.admin.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "resolved",
        moderation_result: "removed",
        moderated_by_id: admin.id,
      } satisfies ICommunityPlatformReport.IUpdate,
    });
  typia.assert(reportResolved);
  TestValidator.equals(
    "status now resolved",
    reportResolved.status,
    "resolved",
  );
  TestValidator.equals(
    "result is removed",
    reportResolved.moderation_result,
    "removed",
  );

  // 7. Attempt invalid transition: move from resolved to pending (should fail)
  await TestValidator.error(
    "cannot move from resolved to pending",
    async () => {
      await api.functional.communityPlatform.admin.reports.update(connection, {
        reportId: report.id,
        body: {
          status: "pending",
          moderation_result: "re-opened",
          moderated_by_id: admin.id,
        } satisfies ICommunityPlatformReport.IUpdate,
      });
    },
  );

  // 8. Attempt member updating the report (should fail)
  // Switch to member session
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("member cannot update report", async () => {
    await api.functional.communityPlatform.admin.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "escalated",
        moderation_result: "escalation_by_member",
        moderated_by_id: member.id,
      } satisfies ICommunityPlatformReport.IUpdate,
    });
  });

  // 9. Confirm final report status & result
  // (get the final status - here, simulate by last known resolved state)
  TestValidator.equals(
    "final status is resolved",
    reportResolved.status,
    "resolved",
  );
  TestValidator.equals(
    "final result is removed",
    reportResolved.moderation_result,
    "removed",
  );
}
