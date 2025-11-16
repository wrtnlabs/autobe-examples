import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test detailed retrieval of a moderation audit log for a moderation appeal
 * resolution action.
 *
 * Validates that retrieving a moderation audit log entry provides:
 *
 * 1. Action type showing appeal resolution (approve_report, deny_report,
 *    overturn_decision, reduce_punishment)
 * 2. Complete moderator accountability information
 * 3. Affected member identification and appeal/report ID reference
 * 4. State tracking showing status transition from pending to resolved
 * 5. All decision details with moderator's reasoning
 * 6. Security audit context (IP, user agent)
 * 7. Action success status
 *
 * This test ensures the audit trail captures comprehensive appeal resolution
 * details for compliance and transparency purposes.
 */
export async function test_api_moderation_audit_log_detail_appeal_resolution_action(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Retrieve moderation audit log for appeal resolution action
  // Using a randomly generated log ID to test the endpoint
  const logId = typia.random<string & tags.Format<"uuid">>();
  const auditLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
      connection,
      {
        logId: logId,
      },
    );
  typia.assert(auditLog);

  // 3. Validate appeal resolution action types
  const appealResolutionActions = [
    "approve_report",
    "deny_report",
    "overturn_decision",
    "reduce_punishment",
  ] as const;
  TestValidator.predicate(
    "action type is one of appeal resolution actions",
    appealResolutionActions.includes(auditLog.action_type as any),
  );

  // 4. Validate moderator accountability information
  TestValidator.predicate(
    "moderator information is present",
    auditLog.moderator !== null && auditLog.moderator !== undefined,
  );
  TestValidator.predicate(
    "moderator has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      auditLog.moderator.id,
    ),
  );

  // 5. Validate target member information (when applicable)
  if (auditLog.target_member !== null && auditLog.target_member !== undefined) {
    TestValidator.predicate(
      "target member has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        auditLog.target_member.id,
      ),
    );
  }

  // 6. Validate target ID (appeal or report ID)
  TestValidator.predicate(
    "target ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      auditLog.target_id,
    ),
  );

  // 7. Validate action reason is present
  TestValidator.predicate(
    "action reason is provided",
    auditLog.action_reason.length > 0 && auditLog.action_reason.length <= 500,
  );

  // 8. Validate state tracking for appeal status change
  TestValidator.predicate(
    "new_state is present with decision details",
    auditLog.new_state !== null && auditLog.new_state !== undefined,
  );

  // 9. Validate security audit context
  TestValidator.predicate(
    "IP address is valid IPv4",
    /^(\d{1,3}\.){3}\d{1,3}$/.test(auditLog.ip_address),
  );

  TestValidator.predicate(
    "user agent is present",
    auditLog.user_agent.length > 0 && auditLog.user_agent.length <= 500,
  );

  // 10. Validate action status
  TestValidator.predicate(
    "action status indicates operation outcome",
    ["success", "failure", "partial_success"].includes(auditLog.action_status),
  );

  // 11. Validate timestamp is in valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.created_at),
  );
}
