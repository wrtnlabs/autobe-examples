import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validates report resolution with 'dismissed' status.
 *
 * This test verifies the complete moderation workflow for dismissing content
 * reports. The scenario involves:
 *
 * 1. Creating a member account to submit a report
 * 2. Creating a moderator account for review
 * 3. Member submitting a report with reason and description
 * 4. Moderator assigning themselves to the report
 * 5. Moderator resolving with 'dismissed' status and detailed notes
 * 6. Validating proper documentation of the dismissal decision
 *
 * The test ensures dismissed reports are properly tracked with moderator
 * reasoning for audit purposes and community transparency.
 */
export async function test_api_report_resolution_dismissed_status(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (reporter)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        display_name: RandomGenerator.name(),
        password: "TestPassword123!",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);
  const memberConnection = {
    ...connection,
    headers: { ...connection.headers },
  };

  // Step 2: Create a moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: "ModeratorPass123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Switch to member and create a report
  await api.functional.auth.member.login(memberConnection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/report",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(
      memberConnection,
      {
        body: {
          reason: "spam",
          description:
            "This content appears to be promotional spam with excessive links",
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "initial report status is pending_review",
    report.status,
    "pending_review",
  );

  // Step 4: Switch to moderator and assign the report
  const moderatorConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  await api.functional.auth.moderator.login(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/moderation",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const assignedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.assign.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          assigned_moderator_id: moderator.id,
        } satisfies IDiscussionBoardReport.IUpdate,
      },
    );
  typia.assert(assignedReport);
  TestValidator.equals(
    "report is assigned to moderator",
    assignedReport.assigned_moderator?.id,
    moderator.id,
  );

  // Step 5: Resolve report with 'dismissed' status
  const resolvedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.resolve(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
          moderator_notes:
            "Content review shows this is legitimate promotional content from an authorized business partner with proper disclosure. No violation of community guidelines found. The links are appropriately contextualized and not spam.",
        } satisfies IDiscussionBoardReport.IResolve,
      },
    );
  typia.assert(resolvedReport);

  // Step 6: Validate the dismissal
  TestValidator.equals(
    "final status is dismissed",
    resolvedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "moderator notes are recorded",
    resolvedReport.moderator_notes !== null &&
      resolvedReport.moderator_notes !== undefined &&
      resolvedReport.moderator_notes.length > 0,
  );
  TestValidator.equals(
    "moderator notes contain decision reasoning",
    resolvedReport.moderator_notes?.includes("legitimate"),
    true,
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "assigned moderator is recorded",
    resolvedReport.assigned_moderator?.id,
    moderator.id,
  );
  TestValidator.predicate(
    "moderator display name is available",
    resolvedReport.assigned_moderator?.display_name !== null &&
      resolvedReport.assigned_moderator?.display_name !== undefined,
  );
}
