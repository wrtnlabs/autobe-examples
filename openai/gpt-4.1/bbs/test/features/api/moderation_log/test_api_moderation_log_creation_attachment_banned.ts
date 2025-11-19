import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Log a moderation event for banning an attachment.
 *
 * This test covers the sequence:
 *
 * 1. Register and authenticate a new admin, capturing the admin's UUID.
 * 2. Issue a moderation log entry for an 'attachment' with a random, valid UUID as
 *    target_id, action "ban", outcome "banned", and a clear rationale.
 * 3. Check that the moderation log is recorded with all requested fields, reflects
 *    the admin as actor, and meets compliance traceability standards.
 */
export async function test_api_moderation_log_creation_attachment_banned(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminJoinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    ip: undefined,
    href: "https://test-discussion-board.com/moderation-join",
    referrer: "https://test-discussion-board.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinReq });
  typia.assert(admin);

  // 2. Use a valid random UUID as the attachment's target_id (schema allows arbitrary UUID for moderation context)
  const attachmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create moderation log for banning the attachment
  const now = new Date().toISOString();
  const logReq = {
    target_type: "attachment",
    target_id: attachmentId,
    action: "ban",
    reason: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 12,
    }),
    outcome: "banned",
    created_at: now,
  } satisfies IDiscussionBoardModerationLog.ICreate;
  const moderationLog: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.admin.moderationLogs.create(
      connection,
      { body: logReq },
    );
  typia.assert(moderationLog);

  // 4. Validate moderation log details for compliance
  TestValidator.equals(
    "target_type must be 'attachment'",
    moderationLog.target_type,
    "attachment",
  );
  TestValidator.equals(
    "target_id matches the log request",
    moderationLog.target_id,
    attachmentId,
  );
  TestValidator.equals("action is 'ban'", moderationLog.action, "ban");
  TestValidator.equals("outcome is 'banned'", moderationLog.outcome, "banned");
  TestValidator.equals(
    "reason field matches",
    moderationLog.reason,
    logReq.reason,
  );
  TestValidator.equals(
    "admin_id matches joined admin",
    moderationLog.admin_id,
    admin.id,
  );
  TestValidator.predicate(
    "created_at is valid ISO string and not older than log creation",
    new Date(moderationLog.created_at).toISOString() >= now,
  );
}
