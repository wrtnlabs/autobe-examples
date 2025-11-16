import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test creating a report using the 'other' reason category.
 *
 * This test validates that members can report content violations that don't fit
 * the predefined categories. The 'other' category provides flexibility for
 * unanticipated violation types and emerging policy issues, allowing moderators
 * to review and categorize novel violations based on detailed descriptions
 * provided by reporters.
 *
 * Test flow:
 *
 * 1. Register a new member account
 * 2. Submit a report with 'other' as the reason category
 * 3. Include a detailed description explaining the violation
 * 4. Verify the report is created with pending_review status
 * 5. Verify reporter information is captured correctly
 * 6. Verify the report structure and all required fields
 */
export async function test_api_report_creation_other_category(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberDisplayName: string = RandomGenerator.name();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        display_name: memberDisplayName,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(registeredMember);
  TestValidator.predicate(
    "member registered successfully with valid id",
    registeredMember.id.length > 0,
  );

  // Step 2: Create a report with 'other' category
  const reportDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: "other",
        description: reportDescription,
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(createdReport);

  // Step 3: Verify report creation and structure
  TestValidator.equals(
    "report reason is 'other'",
    createdReport.reason,
    "other",
  );
  TestValidator.equals(
    "report description matches submitted text",
    createdReport.description,
    reportDescription,
  );
  TestValidator.equals(
    "report status is pending_review",
    createdReport.status,
    "pending_review",
  );

  // Step 4: Verify reporter information is captured
  TestValidator.predicate(
    "reporter information is available",
    createdReport.reporter !== undefined,
  );
  if (createdReport.reporter) {
    TestValidator.equals(
      "reporter display name matches registered member",
      createdReport.reporter.display_name,
      memberDisplayName,
    );
    TestValidator.predicate(
      "reporter account status is active",
      createdReport.reporter.account_status === "active",
    );
  }

  // Step 5: Verify report timestamps
  TestValidator.predicate(
    "report has created_at timestamp",
    createdReport.created_at !== undefined &&
      createdReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "report has updated_at timestamp",
    createdReport.updated_at !== undefined &&
      createdReport.updated_at.length > 0,
  );

  // Step 6: Verify moderator assignment is null on creation
  TestValidator.predicate(
    "assigned_moderator is null on report creation",
    createdReport.assigned_moderator === null ||
      createdReport.assigned_moderator === undefined,
  );

  // Step 7: Verify resolved_at is null for pending reports
  TestValidator.predicate(
    "resolved_at is null for pending_review status",
    createdReport.resolved_at === null ||
      createdReport.resolved_at === undefined,
  );
}
