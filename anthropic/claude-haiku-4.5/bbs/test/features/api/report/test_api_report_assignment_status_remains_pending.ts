import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_report_assignment_status_remains_pending(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to submit a report
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberUsername = `member_${RandomGenerator.alphaNumeric(8)}`;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        display_name: RandomGenerator.name(),
        password: "SecurePassword123!",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a report with pending_review status
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: "offensive_language",
        description: "This content contains offensive language",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  TestValidator.equals(
    "report initial status should be pending_review",
    report.status,
    "pending_review",
  );

  // Step 3: Create and authenticate a moderator
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorUsername = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: "ModeratorPassword123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Login as moderator to switch authentication context
  const moderatorLogin: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPassword123!",
        href: "http://localhost:3000/moderator/dashboard",
        referrer: "http://localhost:3000/moderator/login",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Step 5: Assign the report to the moderator
  const assignedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.assign.update(
      connection,
      {
        reportId: report.id,
        body: {
          assigned_moderator_id: moderator.id,
        } satisfies IDiscussionBoardReport.IUpdate,
      },
    );
  typia.assert(assignedReport);

  // Step 6: Verify that assignment does NOT change the report status
  TestValidator.equals(
    "report status should remain pending_review after assignment",
    assignedReport.status,
    "pending_review",
  );

  // Step 7: Verify that the moderator was properly assigned
  TestValidator.predicate(
    "assigned_moderator should be set",
    assignedReport.assigned_moderator !== null &&
      assignedReport.assigned_moderator !== undefined,
  );

  if (assignedReport.assigned_moderator) {
    TestValidator.equals(
      "assigned moderator id should match",
      assignedReport.assigned_moderator.id,
      moderator.id,
    );
  }
}
