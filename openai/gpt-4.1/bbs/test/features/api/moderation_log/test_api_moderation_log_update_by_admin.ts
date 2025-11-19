import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Validate update of permitted fields (reason, outcome) of a moderation log by
 * an authenticated admin.
 *
 * 1. Register a new admin (join and authenticate).
 * 2. Create a moderation log using admin.
 * 3. Update the moderation log's reason and outcome fields only.
 * 4. Assert that these updates applied and all other fields (target_type,
 *    target_id, action, created_at, admin_id) remain unchanged.
 * 5. Ensure update is properly attributed to the acting admin and all
 *    compliance/audit rules are enforced.
 */
export async function test_api_moderation_log_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinInput = {
    email: adminEmail,
    password: adminPassword satisfies string,
    href: "https://discussion.example.com/admin/join",
    referrer: "https://discussion.example.com/login",
    ip: "192.168.1.1",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Create a moderation log as admin
  const logCreateInput = {
    target_type: RandomGenerator.pick([
      "article",
      "comment",
      "attachment",
    ] as const),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action: RandomGenerator.pick(["remove", "edit", "ban"] as const),
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 15,
    }),
    outcome: RandomGenerator.pick([
      "deleted",
      "edited",
      "banned",
      "restored",
    ] as const),
    created_at: new Date().toISOString(),
  } satisfies IDiscussionBoardModerationLog.ICreate;

  const log = await api.functional.discussionBoard.admin.moderationLogs.create(
    connection,
    { body: logCreateInput },
  );
  typia.assert(log);

  // Store immutable fields for later comparison
  const immutableProps = {
    target_type: log.target_type,
    target_id: log.target_id,
    action: log.action,
    created_at: log.created_at,
    admin_id: log.admin_id,
    id: log.id,
  };

  // 3. Update allowed fields only
  const updateInput = {
    reason: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 12,
    }),
    outcome: RandomGenerator.pick([
      "deleted",
      "edited",
      "banned",
      "restored",
    ] as const),
  } satisfies IDiscussionBoardModerationLog.IUpdate;

  const updated =
    await api.functional.discussionBoard.admin.moderationLogs.update(
      connection,
      {
        moderationLogId: log.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Assert allowed fields changed and immutable fields did not
  TestValidator.notEquals("reason updated", updated.reason, log.reason);
  TestValidator.equals("outcome updated", updated.outcome, updateInput.outcome);
  TestValidator.equals("id is unchanged", updated.id, immutableProps.id);
  TestValidator.equals(
    "target_type is unchanged",
    updated.target_type,
    immutableProps.target_type,
  );
  TestValidator.equals(
    "target_id is unchanged",
    updated.target_id,
    immutableProps.target_id,
  );
  TestValidator.equals(
    "action is unchanged",
    updated.action,
    immutableProps.action,
  );
  TestValidator.equals(
    "created_at is unchanged",
    updated.created_at,
    immutableProps.created_at,
  );
  TestValidator.equals(
    "admin_id is unchanged",
    updated.admin_id,
    immutableProps.admin_id,
  );
}
