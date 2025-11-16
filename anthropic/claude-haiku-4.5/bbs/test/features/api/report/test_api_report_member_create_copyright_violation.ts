import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test member report creation for copyright violation.
 *
 * This test validates the complete workflow for reporting copyright or
 * intellectual property violations on the discussion board:
 *
 * 1. Member registration and authentication
 * 2. Copyright violation report submission with reason and optional description
 * 3. Validation that report is created with pending_review status
 * 4. Verification that report contains all expected field values
 * 5. Confirmation that report is ready for moderator investigation
 *
 * The test ensures IP violation reports are properly documented for moderator
 * review and potential legal action.
 */
export async function test_api_report_member_create_copyright_violation(
  connection: api.IConnection,
) {
  // Step 1: Member joins the discussion board
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Submit a copyright violation report
  const reportDescription =
    "This content violates copyright - it is a direct copy of published material without attribution";

  const reportData = {
    reason: "copyright_violation",
    description: reportDescription,
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(createdReport);

  // Step 3: Validate report properties
  TestValidator.equals(
    "report reason should be copyright_violation",
    createdReport.reason,
    "copyright_violation",
  );

  TestValidator.equals(
    "report description should match submitted description",
    createdReport.description,
    reportDescription,
  );

  TestValidator.equals(
    "report status should be pending_review initially",
    createdReport.status,
    "pending_review",
  );
}
