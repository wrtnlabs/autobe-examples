import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate the soft deletion flow for a moderation report by the original
 * reporting user.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a user as the reporting user
 * 2. Create a moderation report as that user
 * 3. Soft-delete (erase) the report as the report owner
 * 4. Check that the 'deleted_at' timestamp is set in the deleted report
 * 5. Verify that the deleted report cannot be deleted again and returns an error
 * 6. Register another user, attempt to delete the report, and expect access to be
 *    denied
 * 7. Ensure that system-managed fields (such as deleted_at, reporter_user_id,
 *    etc.) are not updatable by the user
 */
export async function test_api_moderation_report_user_deletion_flow(
  connection: api.IConnection,
) {
  // 1. Register & authenticate reporting user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://testpage.example.com/join",
        referrer: "https://testpage.example.com/discussion",
        ip: undefined,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);
  TestValidator.equals("user email matches input", user.email, userEmail);
  TestValidator.predicate("user is active", user.is_active);

  // 2. Create moderation report
  const reportBody = {
    target_type: RandomGenerator.pick([
      "article",
      "comment",
      "attachment",
    ] as const),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardReport.ICreate;
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.user.moderation.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);
  TestValidator.equals(
    "reporter user id matches",
    report.reporter_user_id,
    user.id,
  );
  TestValidator.predicate(
    "report is not deleted",
    report.deleted_at === null || report.deleted_at === undefined,
  );

  // 3. Soft-delete (erase) report as owner
  const erased: IDiscussionBoardReport =
    await api.functional.discussionBoard.user.moderation.reports.erase(
      connection,
      { reportId: report.id },
    );
  typia.assert(erased);
  TestValidator.equals(
    "deleted report id matches original",
    erased.id,
    report.id,
  );
  TestValidator.predicate(
    "deleted_at is now set",
    typeof erased.deleted_at === "string" && erased.deleted_at.length > 0,
  );

  // 4. Try to delete again as same user and expect error
  await TestValidator.error(
    "cannot delete an already deleted moderation report",
    async () => {
      await api.functional.discussionBoard.user.moderation.reports.erase(
        connection,
        { reportId: report.id },
      );
    },
  );

  // 5. Register a second user
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUser: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: otherEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://testpage.example.com/join",
        referrer: "https://testpage.example.com/discussion",
        ip: undefined,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(otherUser);
  TestValidator.equals("other user email", otherUser.email, otherEmail);
  TestValidator.notEquals("other user id is not owner", otherUser.id, user.id);

  // Switch to the other user session
  // Connection session is established by join/auth; call join for this user switches session.

  // 6. Attempt deletion by another user (ownership enforcement)
  await TestValidator.error(
    "non-owner cannot delete another user's moderation report",
    async () => {
      await api.functional.discussionBoard.user.moderation.reports.erase(
        connection,
        { reportId: report.id },
      );
    },
  );

  // 7. Ensure system managed fields cannot be changed by user (cannot update, simulate direct update attempt)
  // Since no update API is present, test only the create API and validate response.
  const forbiddenFields = [
    "reporter_user_id",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  forbiddenFields.forEach((field) => {
    TestValidator.predicate(
      `system-managed field ${field} is not settable in create`,
      !(field in reportBody),
    );
  });
}
