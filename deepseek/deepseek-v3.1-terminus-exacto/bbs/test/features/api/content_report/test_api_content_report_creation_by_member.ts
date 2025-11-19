import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_content_report_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com/signup",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test content report creation with different report reasons
  const reportReasons = [
    "spam",
    "harassment",
    "inappropriate",
    "misinformation",
    "copyright",
    "other",
  ] as const;
  const priorityLevels = ["low", "normal", "high", "critical"] as const;

  for (const reportReason of reportReasons) {
    for (const priority of priorityLevels) {
      const reportData = {
        report_reason: reportReason,
        report_details: RandomGenerator.paragraph({ sentences: 2 }),
        priority: priority,
      } satisfies IDiscussionBoardContentReport.ICreate;

      const createdReport =
        await api.functional.discussionBoard.member.contentReports.create(
          connection,
          { body: reportData },
        );
      typia.assert(createdReport);

      // Step 3: Validate system-assigned status
      TestValidator.equals(
        "report status should be 'pending' for newly created reports",
        createdReport.status,
        "pending",
      );

      // Step 4: Verify required fields are properly set
      TestValidator.equals(
        "report reason should match input",
        createdReport.report_reason,
        reportReason,
      );

      TestValidator.equals(
        "priority level should match input",
        createdReport.priority,
        priority,
      );

      if (reportData.report_details) {
        TestValidator.equals(
          "report details should match input when provided",
          createdReport.report_details,
          reportData.report_details,
        );
      }

      // Step 5: Validate actor information
      TestValidator.equals(
        "actor ID should match member ID",
        createdReport.actor.id,
        member.id,
      );

      TestValidator.predicate(
        "report should have valid creation timestamp",
        createdReport.created_at !== undefined &&
          createdReport.created_at !== null,
      );

      TestValidator.predicate(
        "report should have valid update timestamp",
        createdReport.updated_at !== undefined &&
          createdReport.updated_at !== null,
      );
    }
  }

  // Test edge case: report without details
  const minimalReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: "spam",
          priority: "normal",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(minimalReport);

  TestValidator.equals(
    "minimal report should have undefined details",
    minimalReport.report_details,
    undefined,
  );
}
