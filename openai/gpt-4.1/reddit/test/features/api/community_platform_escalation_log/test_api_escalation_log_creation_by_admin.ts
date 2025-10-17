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
 * Validates that an authenticated admin can create an escalation log for an
 * existing report and report category.
 *
 * 1. Register a new admin and acquire the admin account context.
 * 2. Create a report category via the admin endpoint.
 * 3. (Simulating member-side) Submit a new report referencing the created report
 *    category (post_id or comment_id may be null; just ensure category is
 *    valid).
 * 4. As authenticated admin, create an escalation log referencing the new report.
 *    Provide a detailed reason, assign status ("pending" and "in_review" are
 *    valid), and optionally specify destination_admin_id or resolution_summary
 *    (optional, may omit/null for initial step).
 * 5. Validate that the returned escalation log refers to the correct initiator and
 *    report, has status and escalation_reason as expected, and has correct
 *    timestamps. Type-check with typia.assert.
 * 6. Error scenario: attempt to create escalation log with an invalid report_id
 *    (random UUID), and with an invalid initiator_id, and confirm proper
 *    failure (error is thrown).
 * 7. Permissions edge case: (if possible) try to create an escalation log as an
 *    unauthenticated connection and assert it fails.
 */
export async function test_api_escalation_log_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create report category
  const reportCategoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    allow_free_text: true,
  } satisfies ICommunityPlatformReportCategory.ICreate;
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: reportCategoryBody,
      },
    );
  typia.assert(reportCategory);

  // 3. Member submits a report with created report category
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: null,
        comment_id: null,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 4. Admin creates escalation log
  const escalationReason = RandomGenerator.paragraph({ sentences: 2 });
  const escalationBody = {
    initiator_id: admin.id,
    report_id: report.id,
    escalation_reason: escalationReason,
    status: "pending",
  } satisfies ICommunityPlatformEscalationLog.ICreate;
  const escalationLog =
    await api.functional.communityPlatform.admin.escalationLogs.create(
      connection,
      {
        body: escalationBody,
      },
    );
  typia.assert(escalationLog);
  TestValidator.equals(
    "escalation log initiator matches admin",
    escalationLog.initiator_id,
    admin.id,
  );
  TestValidator.equals(
    "escalation log report reference matches report",
    escalationLog.report_id,
    report.id,
  );
  TestValidator.equals(
    "escalation log status",
    escalationLog.status,
    "pending",
  );
  TestValidator.predicate(
    "escalation log created_at present",
    typeof escalationLog.created_at === "string" &&
      escalationLog.created_at.length > 0,
  );

  // 5. Error scenario: invalid report id
  await TestValidator.error(
    "creating escalation log with non-existent report_id should throw",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.create(
        connection,
        {
          body: {
            initiator_id: admin.id,
            report_id: typia.random<string & tags.Format<"uuid">>(),
            escalation_reason: RandomGenerator.paragraph({ sentences: 2 }),
            status: "pending",
          } satisfies ICommunityPlatformEscalationLog.ICreate,
        },
      );
    },
  );

  // 6. Error scenario: invalid initiator id (random UUID)
  await TestValidator.error(
    "creating escalation log with invalid initiator_id should throw",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.create(
        connection,
        {
          body: {
            initiator_id: typia.random<string & tags.Format<"uuid">>(),
            report_id: report.id,
            escalation_reason: RandomGenerator.paragraph({ sentences: 2 }),
            status: "pending",
          } satisfies ICommunityPlatformEscalationLog.ICreate,
        },
      );
    },
  );

  // 7. Permissions edge case: try as unauthenticated (headers cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated escalation log creation should throw",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.create(
        unauthConn,
        {
          body: escalationBody,
        },
      );
    },
  );
}
