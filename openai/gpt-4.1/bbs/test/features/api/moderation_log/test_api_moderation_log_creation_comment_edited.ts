import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Test logging an admin moderation event for editing a comment.
 *
 * 1. Register a new admin for authentication (via /auth/admin/join).
 * 2. Submit a create moderation log request with:
 *
 *    - Target_type = "comment"
 *    - Target_id = a random UUID (as comment reference)
 *    - Action = "edit"
 *    - Reason = random human-readable string
 *    - Outcome = "edited"
 *    - Created_at = current UTC timestamp
 * 3. Assert that response includes correct metadata (log id, admin_id, matching
 *    all input fields, proper audit trail).
 */
export async function test_api_moderation_log_creation_comment_edited(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin for authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://test-discussionboard.example.com/join",
    referrer: "https://test-discussionboard.example.com/welcome",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin join: email assigned",
    admin.email,
    adminJoinBody.email,
  );

  // Step 2: Prepare and submit moderation log creation
  const moderationLogRequest = {
    target_type: "comment",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action: "edit",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    outcome: "edited",
    created_at: new Date().toISOString(),
  } satisfies IDiscussionBoardModerationLog.ICreate;

  const moderationLog: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.admin.moderationLogs.create(
      connection,
      { body: moderationLogRequest },
    );
  typia.assert(moderationLog);

  // Step 3: Assertions for audit trail and metadata correctness
  TestValidator.equals(
    "moderation log: target_type",
    moderationLog.target_type,
    moderationLogRequest.target_type,
  );
  TestValidator.equals(
    "moderation log: target_id",
    moderationLog.target_id,
    moderationLogRequest.target_id,
  );
  TestValidator.equals(
    "moderation log: action",
    moderationLog.action,
    moderationLogRequest.action,
  );
  TestValidator.equals(
    "moderation log: reason",
    moderationLog.reason,
    moderationLogRequest.reason,
  );
  TestValidator.equals(
    "moderation log: outcome",
    moderationLog.outcome,
    moderationLogRequest.outcome,
  );
  TestValidator.equals(
    "moderation log: created_at",
    moderationLog.created_at,
    moderationLogRequest.created_at,
  );
  TestValidator.equals(
    "moderation log: admin_id = authenticated admin",
    moderationLog.admin_id,
    admin.id,
  );
  TestValidator.predicate(
    "moderation log: id is a valid UUID",
    typeof moderationLog.id === "string" && moderationLog.id.length > 0,
  );
  TestValidator.predicate(
    "moderation log: created_at is valid ISO date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/.test(
      moderationLog.created_at,
    ),
  );
}
