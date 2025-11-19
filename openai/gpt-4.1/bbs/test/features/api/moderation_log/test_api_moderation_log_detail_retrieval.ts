import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate an admin can retrieve full details of a moderation log entry they
 * created.
 *
 * Business and Compliance Context:
 *
 * - Only admins can create and retrieve moderation logs.
 * - Moderation logs must be detailed and immutable, ensuring end-to-end audit and
 *   legal traceability.
 * - All required moderation log fields must be available and match on retrieval:
 *   id, target_type, target_id, action, reason, outcome, created_at, admin_id.
 *   Steps:
 *
 * 1. Register a new admin with a unique email and compliant metadata.
 * 2. Create a new moderation log entry (choose a target_type among "article",
 *    "comment", or "attachment", a random target_id, action, reason, outcome,
 *    created_at as now).
 * 3. Retrieve the moderation log entry by id using admin credentials.
 * 4. Validate that the retrieved log details exactly match all submitted values
 *    (target_type, target_id, action, reason, outcome, created_at), and
 *    id/admin_id fields match those expected (retrieved admin's id should equal
 *    the log's admin_id, etc).
 * 5. Assert presence and type conformance for all metadata fields.
 * 6. Confirm the log's immutable compliance for audit and traceability demands (no
 *    fields missing or altered).
 */
export async function test_api_moderation_log_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create a new moderation log entry as this admin.
  const moderationLogBody = {
    target_type: RandomGenerator.pick([
      "article",
      "comment",
      "attachment",
    ] as const),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action: RandomGenerator.pick(["remove", "edit", "ban", "restore"] as const),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    outcome: RandomGenerator.pick([
      "deleted",
      "edited",
      "banned",
      "restored",
    ] as const),
    created_at: new Date().toISOString(),
  } satisfies IDiscussionBoardModerationLog.ICreate;
  const createdLog =
    await api.functional.discussionBoard.admin.moderationLogs.create(
      connection,
      { body: moderationLogBody },
    );
  typia.assert(createdLog);

  // 3. Retrieve the moderation log entry by id as the admin.
  const retrievedLog =
    await api.functional.discussionBoard.admin.moderationLogs.at(connection, {
      moderationLogId: createdLog.id,
    });
  typia.assert(retrievedLog);

  // 4. Validate all properties match (except id, admin_id set by server but must align with expected context).
  TestValidator.equals(
    "target_type matches",
    retrievedLog.target_type,
    moderationLogBody.target_type,
  );
  TestValidator.equals(
    "target_id matches",
    retrievedLog.target_id,
    moderationLogBody.target_id,
  );
  TestValidator.equals(
    "action matches",
    retrievedLog.action,
    moderationLogBody.action,
  );
  TestValidator.equals(
    "reason matches",
    retrievedLog.reason,
    moderationLogBody.reason,
  );
  TestValidator.equals(
    "outcome matches",
    retrievedLog.outcome,
    moderationLogBody.outcome,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedLog.created_at,
    moderationLogBody.created_at,
  );
  TestValidator.equals("admin_id matches", retrievedLog.admin_id, admin.id);
  TestValidator.equals("id matches createdLog", retrievedLog.id, createdLog.id);

  // 5. Assert full schema conformance and presence of immutable audit metadata.
  typia.assert<IDiscussionBoardModerationLog>(retrievedLog);
}
