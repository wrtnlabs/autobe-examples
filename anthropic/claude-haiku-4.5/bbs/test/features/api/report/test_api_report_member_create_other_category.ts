import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test member report creation using the 'other' category for violations not
 * fitting predefined categories.
 *
 * This test validates the ability to create a report with the 'other' reason
 * category, allowing members to flag content that violates community guidelines
 * but doesn't fit into standard categories like offensive language, spam, or
 * harassment. The test ensures that edge-case violations can be properly
 * documented with optional detailed descriptions for moderator investigation.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account via join endpoint
 * 2. Submit a report with 'other' reason category
 * 3. Optionally include a detailed description explaining the unique concern
 * 4. Validate the report is created with pending_review status
 * 5. Verify the report captures all submitted data correctly
 */
export async function test_api_report_member_create_other_category(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a report with 'other' category
  const reportDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: "other",
        description: reportDescription,
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Step 3: Validate the report was created with correct data
  TestValidator.equals(
    "report reason should be 'other'",
    report.reason,
    "other",
  );

  TestValidator.equals(
    "report description should match input",
    report.description,
    reportDescription,
  );

  TestValidator.equals(
    "report status should be pending_review",
    report.status,
    "pending_review",
  );

  TestValidator.predicate(
    "report should have created_at timestamp",
    report.created_at !== null && report.created_at !== undefined,
  );

  TestValidator.predicate(
    "report should have id",
    report.id !== null && report.id !== undefined,
  );

  // Step 4: Test report creation without description
  const reportWithoutDescription: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: "other",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportWithoutDescription);

  TestValidator.equals(
    "report without description should have reason 'other'",
    reportWithoutDescription.reason,
    "other",
  );

  TestValidator.equals(
    "report without description should have pending_review status",
    reportWithoutDescription.status,
    "pending_review",
  );
}
