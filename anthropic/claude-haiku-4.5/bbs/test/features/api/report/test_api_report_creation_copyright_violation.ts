import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test creating a report for copyright or intellectual property violations.
 *
 * Validates that members can submit reports for content that may infringe on
 * intellectual property rights. The report is properly categorized with the
 * 'copyright_violation' reason for legal and content compliance review.
 *
 * Test workflow:
 *
 * 1. Register a member account for reporting
 * 2. Member authenticates to the system
 * 3. Member submits a copyright violation report with description
 * 4. Verify the report is created with correct categorization
 * 5. Validate report status and structure
 */
export async function test_api_report_creation_copyright_violation(
  connection: api.IConnection,
) {
  // 1. Register a member account for reporting
  const reporterEmail: string = typia.random<string & tags.Format<"email">>();
  const reporterUsername: string = RandomGenerator.alphabets(8);
  const reporterDisplayName: string = RandomGenerator.name();
  const reporterPassword: string = RandomGenerator.alphaNumeric(12);

  const reporterAccount: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: reporterUsername,
        display_name: reporterDisplayName,
        password: reporterPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(reporterAccount);

  // 2. Create copyright violation report with description
  const reportDescription: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const copyrightViolationReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: "copyright_violation",
        description: reportDescription,
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(copyrightViolationReport);

  // 3. Verify report has correct reason categorization for copyright violations
  TestValidator.equals(
    "report reason is copyright_violation",
    copyrightViolationReport.reason,
    "copyright_violation",
  );

  // 4. Verify report initial status is pending_review
  TestValidator.equals(
    "report status is pending_review",
    copyrightViolationReport.status,
    "pending_review",
  );

  // 5. Verify report contains the submitted description
  TestValidator.equals(
    "report description matches submitted description",
    copyrightViolationReport.description,
    reportDescription,
  );

  // 6. Verify report has not been resolved yet (resolved_at should be null)
  TestValidator.equals(
    "report resolved_at is null for pending report",
    copyrightViolationReport.resolved_at,
    null,
  );

  // 7. Verify report has no moderator assigned yet
  TestValidator.equals(
    "report assigned_moderator is null for new report",
    copyrightViolationReport.assigned_moderator,
    null,
  );

  // 8. Verify report has no moderator notes yet
  TestValidator.equals(
    "report moderator_notes is null for new report",
    copyrightViolationReport.moderator_notes,
    null,
  );

  // 9. Verify report has reporter information
  TestValidator.predicate(
    "report reporter is defined",
    copyrightViolationReport.reporter !== undefined,
  );

  if (copyrightViolationReport.reporter) {
    TestValidator.equals(
      "reporter display_name matches created member",
      copyrightViolationReport.reporter.display_name,
      reporterDisplayName,
    );

    TestValidator.equals(
      "reporter account status is active",
      copyrightViolationReport.reporter.account_status,
      "active",
    );
  }
}
