import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create a member account to file the report
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a moderator account to perform the dismissal
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Switch to member context and create a report
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/report",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: RandomGenerator.pick([
          "offensive_language",
          "personal_attack",
          "spam",
          "off_topic",
          "copyright_violation",
          "harassment",
          "other",
        ] as const),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Validate initial report state
  TestValidator.equals(
    "initial report status is pending_review",
    report.status,
    "pending_review",
  );
  TestValidator.predicate(
    "report id exists",
    report.id !== undefined && report.id !== null,
  );

  // 4. Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/moderation",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Moderator dismisses the report with notes
  const moderatorNotes: string = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 3,
    wordMax: 10,
  });

  const dismissedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.dismiss(connection, {
      reportId: report.id,
      body: {
        moderator_notes: moderatorNotes,
      } satisfies IDiscussionBoardReport.IDismiss,
    });
  typia.assert(dismissedReport);

  // 6. Validate dismissal results
  TestValidator.equals(
    "report status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "moderator notes are stored",
    dismissedReport.moderator_notes,
    moderatorNotes,
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    dismissedReport.resolved_at !== undefined &&
      dismissedReport.resolved_at !== null,
  );
  TestValidator.equals(
    "assigned moderator id matches",
    dismissedReport.assigned_moderator?.id,
    moderator.id,
  );
  TestValidator.predicate(
    "moderator notes meet length requirement",
    moderatorNotes.length >= 10 && moderatorNotes.length <= 500,
  );
}
