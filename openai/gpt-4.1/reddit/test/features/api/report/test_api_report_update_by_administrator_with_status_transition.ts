import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an administrator can update any user-generated report by
 * reportId.
 *
 * Test Steps:
 *
 * 1. Register and authenticate a new administrator.
 * 2. Assume a report entity exists (as no report creation API is exposed in this
 *    test context).
 * 3. Update the report using administrator privileges, changing status,
 *    report_type, and reason.
 * 4. Assert the returned report reflects all changes. Ensure immutable properties
 *    remain correct.
 * 5. Edge case: Try updating a non-existent report and assert an error is
 *    returned.
 */
export async function test_api_report_update_by_administrator_with_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    business_status: RandomGenerator.pick(["onboarded", "pending", null]),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // Step 2: Prepare a mock report to update (assume system already seeded or accessible)
  // We simulate a report entity because report creation API is not provided
  const seedReport: ICommunityPlatformReport =
    typia.random<ICommunityPlatformReport>();
  typia.assert(seedReport);

  // Step 3: Update the report with new status and values
  const statusTransitions = [
    "open",
    "escalated",
    "resolved",
    "closed",
  ] as const;
  const initialStatus = RandomGenerator.pick(statusTransitions);
  const newStatus = RandomGenerator.pick(
    statusTransitions.filter((s) => s !== initialStatus),
  );
  const updateBody = {
    report_type: "rule_violation",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: newStatus,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updated: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.update(
      connection,
      {
        reportId: seedReport.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated report ID same as original",
    updated.id,
    seedReport.id,
  );
  TestValidator.equals(
    "report_type updated",
    updated.report_type,
    updateBody.report_type,
  );
  TestValidator.equals("reason updated", updated.reason, updateBody.reason);
  TestValidator.equals("status updated", updated.status, updateBody.status);
  // Immutable fields remain unchanged
  TestValidator.equals(
    "reporter remains unchanged",
    updated.reporter,
    seedReport.reporter,
  );
  TestValidator.equals(
    "reported_post remains unchanged",
    updated.reported_post,
    seedReport.reported_post,
  );
  TestValidator.equals(
    "reported_comment remains unchanged",
    updated.reported_comment,
    seedReport.reported_comment,
  );
  TestValidator.equals(
    "reported_community remains unchanged",
    updated.reported_community,
    seedReport.reported_community,
  );

  // Step 4: Edge case - update a non-existent report
  await TestValidator.error(
    "should return error when updating non-existent report",
    async () => {
      await api.functional.communityPlatform.administrator.reports.update(
        connection,
        {
          reportId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
