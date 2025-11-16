import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

/**
 * Ensure administrator-level access to moderation audit logs by UUID.
 *
 * The test checks that, after authenticating via administrator join (POST
 * /auth/administrator/join), the administrator can retrieve a moderation audit
 * log entry by its unique id using GET
 * /communityPlatform/administrator/moderationAuditLogs/{moderationAuditLogId}.
 *
 * 1. Create a new administrator via api.functional.auth.administrator.join.
 * 2. Use a randomly generated UUID to simulate a moderation audit log id (since
 *    audit log data setup is not in scope of this scenario).
 * 3. Retrieve the moderation audit log using administrator privileges.
 * 4. Assert that all required fields (id, moderation_action, event_type,
 *    timestamps, actor references, and report if present) are present and
 *    properly typed.
 * 5. Assert that actor_administrator field matches the current administrator id
 *    (if actor is present), and actor_moderator/report are nullable as per
 *    schema.
 */
export async function test_api_moderation_audit_log_access_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(admin);

  // 2. Generate a random UUID for audit log id (simulate selection of a known id)
  const moderationAuditLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the moderation audit log by id using administrator privilege
  const log: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
      connection,
      {
        moderationAuditLogId,
      },
    );
  typia.assert(log);

  // 4. Business validations on returned log object structure
  TestValidator.predicate("audit log id is string", typeof log.id === "string");
  TestValidator.predicate(
    "moderation action must be present and is object with id",
    typeof log.moderation_action === "object" &&
      typeof log.moderation_action.id === "string",
  );
  TestValidator.predicate(
    "event_type field is non-empty string",
    typeof log.event_type === "string" && !!log.event_type,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    typeof log.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(log.created_at),
  );
  // actor_administrator may be null or object
  if (
    log.actor_administrator !== null &&
    log.actor_administrator !== undefined
  ) {
    TestValidator.predicate(
      "actor_administrator is object with id",
      typeof log.actor_administrator === "object" &&
        typeof log.actor_administrator.id === "string",
    );
  }
  // actor_moderator may be null or object
  if (log.actor_moderator !== null && log.actor_moderator !== undefined) {
    TestValidator.predicate(
      "actor_moderator is object with id",
      typeof log.actor_moderator === "object" &&
        typeof log.actor_moderator.id === "string",
    );
  }
  // report is nullable summary
  if (log.report !== null && log.report !== undefined) {
    TestValidator.predicate(
      "report is object with id",
      typeof log.report === "object" && typeof log.report.id === "string",
    );
  }
  // event_reason may be nullable string
  if (log.event_reason !== null && log.event_reason !== undefined) {
    TestValidator.predicate(
      "event_reason is string",
      typeof log.event_reason === "string",
    );
  }
}
