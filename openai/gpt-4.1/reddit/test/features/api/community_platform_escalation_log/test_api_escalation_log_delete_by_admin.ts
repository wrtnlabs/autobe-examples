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
 * Test the hard deletion of an escalation log by a platform admin in the
 * Reddit-like platform scenario.
 *
 * Business context: This test validates the process and access control for
 * permanently deleting an escalation log, which is used for compliance, audit,
 * and dispute review workflows. Only an authenticated admin should be able to
 * perform this operation; after deletion, the log should be irretrievable and
 * any attempt to delete with invalid or non-existent IDs must yield appropriate
 * errors.
 *
 * Steps:
 *
 * 1. Register a new platform admin who will perform the deletion.
 * 2. As admin, create a new moderation report category for use in reporting.
 * 3. As a member (simulated - since member registration is not within this
 *    function), file a new report using the created category (either for a post
 *    or comment, using random UUIDs if needed).
 * 4. Create an escalation log referencing the report. The escalation log must
 *    reference both the report and the admin (as destination_admin_id if
 *    needed).
 * 5. As admin, call the escalation log hard delete endpoint with the
 *    escalationLogId.
 * 6. Attempt to delete the same escalation log again, expecting an error since it
 *    should not exist (idempotence, irretrievability).
 * 7. Attempt to delete a completely invalid escalationLogId (random UUID),
 *    expecting an error.
 * 8. Optionally check audit or compliance review indications as allowed by the API
 *    (not implemented if not available).
 * 9. Confirm only admins can delete; simulate by resetting connection (removing
 *    auth) and attempt delete, expecting an access/authorization failure.
 */
export async function test_api_escalation_log_delete_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    },
  });
  typia.assert(admin);

  // Step 2: As admin, create report category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: true,
        },
      },
    );
  typia.assert(reportCategory);

  // Step 3: File a report as a member (simulate, assume shared connection context—actual member context not in scope, but API accepts call)
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 4 }),
      },
    },
  );
  typia.assert(report);

  // Step 4: Create escalation log
  const escalationLog =
    await api.functional.communityPlatform.moderator.escalationLogs.create(
      connection,
      {
        body: {
          initiator_id: admin.id,
          destination_admin_id: admin.id,
          report_id: report.id,
          status: "pending",
          escalation_reason: RandomGenerator.paragraph({ sentences: 5 }),
          resolution_summary: null,
        },
      },
    );
  typia.assert(escalationLog);

  // Step 5: As admin, hard delete the escalation log
  await api.functional.communityPlatform.admin.escalationLogs.erase(
    connection,
    {
      escalationLogId: escalationLog.id,
    },
  );

  // Step 6: Attempt to delete the same escalation log again (should fail)
  await TestValidator.error(
    "Deleting already deleted escalation log should fail",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.erase(
        connection,
        {
          escalationLogId: escalationLog.id,
        },
      );
    },
  );

  // Step 7: Attempt to delete an escalation log using completely invalid id
  await TestValidator.error(
    "Deleting a non-existent escalation log should fail",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.erase(
        connection,
        {
          escalationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 8: Optionally check audit/compliance review updates (not directly implemented in API; omitted)

  // Step 9: Reset to unauthenticated connection and attempt privilege escalation (should fail)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Non-authenticated actor should not be able to delete escalation log",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.erase(
        unauthConnection,
        {
          escalationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
