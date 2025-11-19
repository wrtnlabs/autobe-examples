import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate permanent deletion of a moderation log entry by a registered admin.
 *
 * Ensures:
 *
 * 1. Admin is registered and authenticated
 * 2. Moderation log entry is created successfully
 * 3. Admin deletes the moderation log entry by ID
 * 4. Deletion is permanent and log is no longer retrievable
 *
 * Steps:
 *
 * 1. Register a new admin with unique email/password and required session context
 * 2. Authenticate as admin (join automatically authenticates)
 * 3. Create a moderation log entry with valid attributes
 * 4. Delete the log entry by its id as the same admin
 * 5. Attempt to retrieve the deleted log entry, ensuring it's not found or returns
 *    an error
 */
export async function test_api_moderation_log_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href:
      "https://test-discussion-board-admin-join/" +
      RandomGenerator.alphaNumeric(8),
    referrer:
      "https://test-discussion-board-referrer/" +
      RandomGenerator.alphaNumeric(5),
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Create a moderation log entry as this admin
  const moderationLogInput = {
    target_type: RandomGenerator.pick([
      "article",
      "comment",
      "attachment",
    ] as const),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action: RandomGenerator.pick(["remove", "edit", "ban"] as const),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    outcome: RandomGenerator.pick([
      "deleted",
      "edited",
      "banned",
      "restored",
    ] as const),
    created_at: new Date().toISOString(),
  } satisfies IDiscussionBoardModerationLog.ICreate;
  const moderationLog =
    await api.functional.discussionBoard.admin.moderationLogs.create(
      connection,
      { body: moderationLogInput },
    );
  typia.assert(moderationLog);
  TestValidator.equals(
    "moderation log action matches input",
    moderationLog.action,
    moderationLogInput.action,
  );

  // 3. Delete the moderation log entry by its id
  await api.functional.discussionBoard.admin.moderationLogs.erase(connection, {
    moderationLogId: moderationLog.id,
  });

  // 4. Attempt to retrieve the deleted log should fail (simulate with create-then-delete test: since no GET API is available per given APIs, deletion itself is the test)
  // As a workaround, try to delete it again and confirm that this results in an error
  await TestValidator.error(
    "deleting already-deleted moderation log must fail",
    async () => {
      await api.functional.discussionBoard.admin.moderationLogs.erase(
        connection,
        {
          moderationLogId: moderationLog.id,
        },
      );
    },
  );
}
