import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test report dismissal with comprehensive moderator notes documenting detailed
 * investigation findings.
 *
 * This test validates the complete workflow of submitting a content report and
 * having a moderator investigate and dismiss it with detailed notes explaining
 * their decision. The test ensures:
 *
 * 1. A member can submit a report with detailed description
 * 2. A moderator can authenticate to the system
 * 3. The moderator can dismiss the report with maximum-length investigation notes
 * 4. The report status transitions to dismissed
 * 5. All moderator notes are preserved exactly as provided
 * 6. The report includes complete moderator identity information
 * 7. Timestamps are properly updated to reflect the dismissal action
 *
 * This validates that the moderation system maintains clear audit trails and
 * allows moderators to document complex investigation findings for consistency
 * analysis.
 */
export async function test_api_report_dismissal_with_detailed_investigation_notes(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to submit the report
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberUsername = `member_${RandomGenerator.alphaNumeric(8)}`;
  const memberDisplayName = RandomGenerator.name();

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        display_name: memberDisplayName,
        password: "TestPassword123!",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member should have authorization token",
    !!memberAuth.token.access,
  );

  // Step 2: Submit a report with detailed description
  const reportDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: "personal_attack",
        description: reportDescription,
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);
  TestValidator.equals(
    "initial report status",
    report.status,
    "pending_review",
  );
  TestValidator.equals(
    "report description matches submission",
    report.description,
    reportDescription,
  );

  // Step 3: Create a moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorUsername = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const moderatorDisplayName = RandomGenerator.name();

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: "ModeratorPassword123!",
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator should have authorization token",
    !!moderatorAuth.token.access,
  );

  // Step 4: Construct detailed moderator investigation notes (near maximum length of 500 characters)
  const investigationNotes = `After thorough investigation, this report does not substantiate a violation of community guidelines. The reported content contains strong language that, while potentially uncomfortable, represents legitimate expression of opinion. The context indicates satire and commentary rather than targeted harassment. Cross-referencing with similar content and community standards shows alignment with permissible discourse. The reporter may benefit from utilizing content filtering options available in user preferences. No further action recommended at this time. Investigation completed on ${new Date().toISOString().split("T")[0]}.`;

  TestValidator.predicate(
    "investigation notes within length limit",
    investigationNotes.length <= 500,
  );
  TestValidator.predicate(
    "investigation notes minimum length met",
    investigationNotes.length >= 10,
  );

  // Step 5: Dismiss the report with detailed investigation notes
  const dismissedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.dismiss(connection, {
      reportId: report.id,
      body: {
        moderator_notes: investigationNotes,
      } satisfies IDiscussionBoardReport.IDismiss,
    });
  typia.assert(dismissedReport);

  // Step 6: Validate report status transition to dismissed
  TestValidator.equals(
    "report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );

  // Step 7: Validate moderator notes are preserved exactly
  TestValidator.equals(
    "moderator notes preserved exactly",
    dismissedReport.moderator_notes,
    investigationNotes,
  );

  // Step 8: Validate moderator identity is recorded
  TestValidator.predicate(
    "dismissing moderator information present",
    dismissedReport.assigned_moderator !== null &&
      dismissedReport.assigned_moderator !== undefined,
  );

  if (dismissedReport.assigned_moderator) {
    TestValidator.equals(
      "assigned moderator id matches",
      dismissedReport.assigned_moderator.id,
      moderatorAuth.id,
    );
    TestValidator.equals(
      "moderator display name recorded",
      dismissedReport.assigned_moderator.display_name,
      moderatorDisplayName,
    );
  }

  // Step 9: Validate timestamp updates
  TestValidator.predicate(
    "updated_at timestamp reflects dismissal",
    new Date(dismissedReport.updated_at).getTime() >=
      new Date(report.created_at).getTime(),
  );

  TestValidator.predicate(
    "resolved_at timestamp is set for dismissed report",
    dismissedReport.resolved_at !== null &&
      dismissedReport.resolved_at !== undefined,
  );

  if (dismissedReport.resolved_at) {
    TestValidator.predicate(
      "resolved_at is after creation",
      new Date(dismissedReport.resolved_at).getTime() >=
        new Date(report.created_at).getTime(),
    );
  }

  // Step 10: Validate complete report structure
  TestValidator.predicate(
    "report id matches original",
    dismissedReport.id === report.id,
  );
  TestValidator.equals(
    "report reason unchanged",
    dismissedReport.reason,
    report.reason,
  );
  TestValidator.predicate(
    "reporter information preserved",
    dismissedReport.reporter !== undefined,
  );
}
