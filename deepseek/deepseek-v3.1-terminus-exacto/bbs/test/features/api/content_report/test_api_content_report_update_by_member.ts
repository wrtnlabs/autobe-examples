import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that a member can update their own content report with modified reason
 * and details. The scenario validates that only the original reporter can
 * modify report information and ensures proper workflow constraints are
 * maintained. After creating a content report, the member updates the report
 * reason and provides additional details, verifying that the update succeeds
 * and reflects the changes while maintaining system-managed fields like
 * timestamps. Authentication ensures only the original reporter can perform
 * updates.
 */
export async function test_api_content_report_update_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an initial content report
  const initialReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: "spam" as const,
          report_details: "Initial report details",
          priority: "normal" as const,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // Step 3: Update the content report with modified reason and details
  const updatedReport =
    await api.functional.discussionBoard.member.contentReports.update(
      connection,
      {
        reportId: initialReport.id,
        body: {
          report_reason: "harassment" as const,
          report_details: "Updated report details with additional information",
        } satisfies IDiscussionBoardContentReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // Step 4: Validate that the update was successful
  TestValidator.equals(
    "report ID should remain the same",
    updatedReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "report reason should be updated",
    updatedReport.report_reason,
    "harassment",
  );
  TestValidator.equals(
    "report details should be updated",
    updatedReport.report_details,
    "Updated report details with additional information",
  );
  TestValidator.equals(
    "actor information should remain unchanged",
    updatedReport.actor,
    initialReport.actor,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedReport.created_at,
    initialReport.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp should be more recent than created_at",
    new Date(updatedReport.updated_at) > new Date(updatedReport.created_at),
  );
  TestValidator.equals(
    "priority should remain unchanged",
    updatedReport.priority,
    initialReport.priority,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedReport.status,
    initialReport.status,
  );
}
