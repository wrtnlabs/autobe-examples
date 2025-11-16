import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test creating a report with detailed description field.
 *
 * This test validates the creation of a discussion board report that includes
 * an optional detailed description (up to 500 characters) explaining why the
 * content violates community guidelines. The test ensures that:
 *
 * 1. A member can register and authenticate
 * 2. The member can submit a report with a detailed description
 * 3. The report is created with pending_review status
 * 4. The description is properly stored and returned in the response
 * 5. The reporter information is captured correctly
 *
 * This workflow represents the common use case where members provide detailed
 * context when reporting inappropriate content to help moderators understand
 * their concerns and make informed moderation decisions.
 */
export async function test_api_report_creation_with_detailed_description(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Create a report with detailed description
  const reportDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 500); // Ensure description doesn't exceed 500 characters

  const reportData = {
    reason: RandomGenerator.pick([
      "offensive_language",
      "personal_attack",
      "spam",
      "off_topic",
      "copyright_violation",
      "harassment",
      "other",
    ] as const),
    description: reportDescription,
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(createdReport);

  // Step 3: Validate report contains the detailed description
  TestValidator.equals(
    "report description matches input",
    createdReport.description,
    reportDescription,
  );

  // Step 4: Verify description length constraint
  TestValidator.predicate(
    "description length is within 500 character limit",
    createdReport.description === undefined ||
      createdReport.description === null ||
      createdReport.description.length <= 500,
  );

  // Step 5: Confirm report status and other properties
  TestValidator.equals(
    "report status is pending_review",
    createdReport.status,
    "pending_review",
  );

  // Step 6: Verify reason is correctly stored
  TestValidator.equals(
    "report reason matches input",
    createdReport.reason,
    reportData.reason,
  );

  // Step 7: Validate reporter information is captured
  if (createdReport.reporter) {
    TestValidator.predicate(
      "reporter has valid id",
      createdReport.reporter.id !== null &&
        createdReport.reporter.id !== undefined,
    );
    TestValidator.predicate(
      "reporter display name exists",
      createdReport.reporter.display_name !== null &&
        createdReport.reporter.display_name !== undefined,
    );
  }

  // Step 8: Verify timestamps are present
  TestValidator.predicate(
    "report has created_at timestamp",
    createdReport.created_at !== null && createdReport.created_at !== undefined,
  );

  TestValidator.predicate(
    "report has updated_at timestamp",
    createdReport.updated_at !== null && createdReport.updated_at !== undefined,
  );

  // Step 9: Confirm assigned_moderator is null on creation
  TestValidator.equals(
    "assigned_moderator is null on creation",
    createdReport.assigned_moderator,
    null,
  );

  // Step 10: Verify moderator_notes is null on creation
  TestValidator.equals(
    "moderator_notes is null on creation",
    createdReport.moderator_notes,
    null,
  );
}
