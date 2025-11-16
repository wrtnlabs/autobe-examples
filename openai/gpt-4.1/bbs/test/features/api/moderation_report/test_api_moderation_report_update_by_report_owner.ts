import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that a reporting user can update an existing moderation report they
 * own using their authenticated context.
 *
 * This e2e test verifies the crucial business rules for user-owned moderation
 * report update. The workflow includes:
 *
 * 1. Registering a new user, establishing the authentication context for all
 *    subsequent requests.
 * 2. The user creates a moderation report (with valid target_type, target_id,
 *    etc.).
 * 3. The user then updates the report, changing only allowed fields (reason,
 *    description, status as permitted) and verifies:
 *
 *    - Only allowed fields are changed (e.g., system fields are not mutated).
 *    - Reporter_user_id remains constant; timestamps update as expected; deleted_at
 *         is not settable by user.
 *    - An attempt to update with an invalid status does not succeed.
 *    - If update is attempted by a different user, expect proper error or forbidden
 *         result.
 *    - Each successful update causes an updated_at change (indicative of
 *         audit/compliance event).
 *    - Results strictly comply with documented DTO shape and contract.
 */
export async function test_api_moderation_report_update_by_report_owner(
  connection: api.IConnection,
) {
  // 1. Register new user and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(12),
        href: "https://discussion-board.test/register",
        referrer: "https://discussion-board.test/landing",
        ip: typia.random<
          string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)
        >(),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 2. Create new moderation report
  const initialReason = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const targetType = RandomGenerator.pick([
    "article",
    "comment",
    "attachment",
  ] as const);
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.user.moderation.reports.create(
      connection,
      {
        body: {
          target_type: targetType,
          target_id: targetId,
          reason: initialReason,
          description: initialDescription,
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "reporter_user_id is user",
    report.reporter_user_id,
    user.id,
  );
  TestValidator.equals(
    "target_type matches initial",
    report.target_type,
    targetType,
  );
  TestValidator.equals("target_id matches initial", report.target_id, targetId);
  TestValidator.equals("reason matches initial", report.reason, initialReason);
  TestValidator.equals(
    "description matches initial",
    report.description,
    initialDescription,
  );
  const {
    id: reportId,
    created_at: createdAt,
    updated_at: initialUpdatedAt,
  } = report;

  // 3. Successfully update report with user context
  const updateReason = RandomGenerator.paragraph({ sentences: 2 });
  const updateDescription = RandomGenerator.paragraph({ sentences: 4 });
  // Try a status change flow: open -> in_review, only if business-allowed
  const allowedStatuses = [
    "open",
    "in_review",
    "resolved",
    "rejected",
    "escalated",
  ] as const;
  const initialStatus = report.status;
  // Choose an allowed next status, if possible
  const otherStatuses = allowedStatuses.filter((s) => s !== initialStatus);
  const nextStatus =
    otherStatuses.length > 0
      ? RandomGenerator.pick(otherStatuses)
      : initialStatus;

  const updatedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.user.moderation.reports.update(
      connection,
      {
        reportId,
        body: {
          reason: updateReason,
          description: updateDescription,
          status: nextStatus,
        } satisfies IDiscussionBoardReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Check that only allowed fields changed
  TestValidator.equals(
    "report id should remain same",
    updatedReport.id,
    report.id,
  );
  TestValidator.equals(
    "reporter_user_id does not change",
    updatedReport.reporter_user_id,
    user.id,
  );
  TestValidator.equals(
    "target_type does not change",
    updatedReport.target_type,
    report.target_type,
  );
  TestValidator.equals(
    "target_id does not change",
    updatedReport.target_id,
    report.target_id,
  );
  TestValidator.equals("reason updated", updatedReport.reason, updateReason);
  TestValidator.equals(
    "description updated",
    updatedReport.description,
    updateDescription,
  );
  TestValidator.equals("status updated", updatedReport.status, nextStatus);
  TestValidator.notEquals(
    "updated_at is changed after update",
    updatedReport.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "created_at not changed",
    updatedReport.created_at,
    createdAt,
  );
  TestValidator.equals(
    "deleted_at not changed (should still be null/undefined)",
    updatedReport.deleted_at,
    report.deleted_at,
  );

  // Try an update with an illegal status value, which should fail
  await TestValidator.error(
    "illegal status value for update should fail",
    async () => {
      await api.functional.discussionBoard.user.moderation.reports.update(
        connection,
        {
          reportId,
          body: {
            status: "illegal_status_value_!",
          } satisfies IDiscussionBoardReport.IUpdate,
        },
      );
    },
  );

  // Try updating as a non-owner (different user should not be able to update)
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherUser: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: otherUserEmail,
        password: RandomGenerator.alphabets(12),
        href: "https://discussion-board.test/register",
        referrer: "https://discussion-board.test/landing",
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(otherUser);
  await TestValidator.error("non-owner update forbidden", async () => {
    await api.functional.discussionBoard.user.moderation.reports.update(
      connection,
      {
        reportId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardReport.IUpdate,
      },
    );
  });
}
