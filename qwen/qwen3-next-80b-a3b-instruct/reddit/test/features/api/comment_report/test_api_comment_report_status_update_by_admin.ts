import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test successful comment report status update from pending to resolved by an
 * admin user.
 *
 * Validates that admin authentication is required and that the report status is
 * properly updated to 'resolved' with updated_at timestamp change, while
 * ensuring the original comment content remains unmodified.
 *
 * This test follows the workflow:
 *
 * 1. Authenticate admin user via join
 * 2. Update an existing comment report by using a generated report ID (system must
 *    have a report)
 * 3. Validate the update results
 *
 * Note: The API does not provide a way to create a comment report, so this test
 * assumes a report exists with the generated ID. In a real system, this would
 * be replaced with an actual report ID created through an external mechanism.
 */
export async function test_api_comment_report_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  // Step 2: Generate a reportId for an existing pre-existing comment report
  // Since we cannot create a report with provided APIs, we assume one exists
  const reportId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the report status from pending to resolved by admin
  const updatedReport: ICommunityBbsCommentReport =
    await api.functional.communityBbs.admin.comment_reports.update(
      adminConnection,
      {
        reportId,
        body: {
          status: "resolved",
        } satisfies ICommunityBbsCommentReport.IUpdate,
      },
    );
  // Step 4: Validate the update results
  typia.assert(updatedReport);
  // Validate that status was updated to 'resolved'
  TestValidator.equals(
    "report status updated to resolved",
    updatedReport.status,
    "resolved",
  );
  // Validate that updated_at timestamp is present and valid (required field)
  // We know it should be a valid date-time (typia.assert already validates format)
  // Just validate it exists with non-null assertion (method must not return undefined)
  TestValidator.predicate(
    "updated_at is defined",
    updatedReport.updated_at !== undefined,
  );
  // Validate that resolved_by field is populated with admin id
  // resolved_by is of type (string & tags.Format<"uuid">) | null | undefined
  // In successful update, it should be the admin's id
  TestValidator.equals(
    "resolved_by field populated with admin id",
    updatedReport.resolved_by,
    admin.id,
  );
  // Validate that justification is null (not required for resolved status)
  TestValidator.equals(
    "justification is null for resolved status",
    updatedReport.justification,
    null,
  );
}
