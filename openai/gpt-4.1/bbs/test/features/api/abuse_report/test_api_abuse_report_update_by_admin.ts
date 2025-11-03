import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates the admin update workflow for abuse reports, covering:
 *
 * 1. Admin registration and authentication
 * 2. A user submits a new abuse report
 * 3. Admin fetches the report ID from step 2 and updates (status, category,
 *    reason)
 * 4. Validates changes are reflected
 * 5. Asserts that unauthorized updates are rejected
 */
export async function test_api_abuse_report_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: adminDisplayName,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // (Assume user is already authenticated, or this endpoint does not require user login for abuse report creation)
  // 2. User submits a new abuse report
  const reportCreateBody = {
    abuse_category: RandomGenerator.pick([
      "spam",
      "offensive",
      "harassment",
      "illegal",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardAbuseReport.ICreate;
  const abuseReport: IDiscussionBoardAbuseReport =
    await api.functional.discussionBoard.user.abuseReports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(abuseReport);

  // 3. Admin updates the abuse report details
  // Switch to admin account is managed by SDK (token from join call is set)
  const updateBody = {
    abuse_category: RandomGenerator.pick(["offensive", "harassment"] as const),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: RandomGenerator.pick([
      "pending",
      "in_review",
      "closed",
      "rejected",
    ] as const),
  } satisfies IDiscussionBoardAbuseReport.IUpdate;
  const updatedAbuseReport: IDiscussionBoardAbuseReport =
    await api.functional.discussionBoard.admin.abuseReports.update(connection, {
      abuseReportId: abuseReport.id,
      body: updateBody,
    });
  typia.assert(updatedAbuseReport);

  // 4. Validate that changes are reflected
  TestValidator.equals(
    "abuse category updated",
    updatedAbuseReport.abuse_category,
    updateBody.abuse_category,
  );
  TestValidator.equals(
    "reason updated",
    updatedAbuseReport.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "status updated",
    updatedAbuseReport.status,
    updateBody.status,
  );
  TestValidator.equals(
    "report id is stable",
    updatedAbuseReport.id,
    abuseReport.id,
  );
  TestValidator.equals(
    "report updated_at changed",
    updatedAbuseReport.updated_at !== abuseReport.updated_at,
    true,
  );

  // 5. Attempt to update without admin authentication, expect failure
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update should fail", async () => {
    await api.functional.discussionBoard.admin.abuseReports.update(unauthConn, {
      abuseReportId: abuseReport.id,
      body: updateBody,
    });
  });
}
