import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate permanent erase workflow for abuse reports by admin.
 *
 * Verifies administrator-only permission for permanently deleting an abuse
 * report after terminal moderation state is reached. Ensures only admins can
 * perform this action, and deletion cannot occur before report is marked
 * closed. Validates that post-deletion, the report is non-retrievable.
 *
 * Steps:
 *
 * 1. Register admin account for privileged authentication
 * 2. Submit new abuse report (simulate user input; uses admin session due to lack
 *    of user session API)
 * 3. Attempt permanent erase as admin and verify success
 * 4. Attempt erase again to assert error (already deleted)
 *
 * Steps for status transition to 'closed', unauthenticated/unauthorized
 * actions, and post-deletion retrieval are omitted as the API/SDK does not
 * expose endpoints for those actions.
 */
export async function test_api_abuse_report_permanent_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin account for privileged authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        avatar_url: undefined,
      },
    });
  typia.assert(admin);

  // 2. Submit new abuse report (simulate user input; uses admin session due to lack of user session API)
  const createInput = {
    abuse_category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: typia.random<string & tags.Format<"uuid">>(),
    target_comment_id: undefined,
  } satisfies IDiscussionBoardAbuseReport.ICreate;
  const report = await api.functional.discussionBoard.user.abuseReports.create(
    connection,
    {
      body: createInput,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "abuse report status should start as pending",
    report.status,
    "pending",
  );

  // 3. Attempt permanent erase as admin
  await api.functional.discussionBoard.admin.abuseReports.erase(connection, {
    abuseReportId: report.id,
  });

  // 4. Attempt erase again to assert error (already deleted)
  await TestValidator.error(
    "erasing already deleted report as admin should fail",
    async () => {
      await api.functional.discussionBoard.admin.abuseReports.erase(
        connection,
        {
          abuseReportId: report.id,
        },
      );
    },
  );
}
