import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test retrieval of an audit log entry with action_status 'failure'.
 *
 * This test validates that the moderation audit log system properly records
 * failed moderation actions. It authenticates as a moderator, retrieves an
 * audit log entry for a failed action (such as attempting to remove an
 * already-deleted post), and verifies that:
 *
 * 1. The action_status field is 'failure'
 * 2. The status_details field contains technical explanation of the failure
 * 3. All audit trail fields are properly populated
 * 4. The log maintains accountability for incomplete actions
 *
 * This is critical for compliance, audit trails, and understanding moderator
 * activity.
 */
export async function test_api_moderation_audit_logs_failed_action_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve an audit log entry with failed action status
  // Use a mock logId to retrieve a failed audit log entry
  const failedLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const auditLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.at(
      connection,
      {
        logId: failedLogId,
      },
    );
  typia.assert(auditLog);

  // Step 3: Validate that the action_status is 'failure'
  TestValidator.equals(
    "action_status is failure",
    auditLog.action_status,
    "failure",
  );

  // Step 4: Validate that status_details contains explanation for the failure
  TestValidator.predicate(
    "status_details is populated for failed action",
    () =>
      auditLog.status_details !== undefined && auditLog.status_details !== null,
  );

  // Step 5: Validate that status_details has meaningful length (not empty)
  TestValidator.predicate(
    "status_details contains technical explanation",
    () =>
      auditLog.status_details !== undefined &&
      auditLog.status_details.length > 0,
  );

  // Step 6: Validate core audit log structure
  TestValidator.predicate("moderator information present", () => {
    return (
      auditLog.moderator !== undefined &&
      auditLog.moderator.id !== undefined &&
      auditLog.moderator.username !== undefined
    );
  });

  // Step 7: Validate target resource identification
  TestValidator.predicate("target_id is valid UUID", () => {
    return auditLog.target_id !== undefined && auditLog.target_id.length === 36;
  });

  // Step 8: Validate action tracking fields
  TestValidator.predicate(
    "action_type is valid moderation action",
    () =>
      auditLog.action_type !== undefined &&
      [
        "remove_post",
        "remove_comment",
        "issue_warning",
        "suspend_user",
        "ban_user",
        "approve_report",
        "deny_report",
        "overturn_decision",
        "reduce_punishment",
      ].includes(auditLog.action_type),
  );

  // Step 9: Validate action_reason is provided
  TestValidator.predicate("action_reason is provided", () => {
    return (
      auditLog.action_reason !== undefined && auditLog.action_reason.length > 0
    );
  });

  // Step 10: Validate security context (IP address and user agent)
  TestValidator.predicate("ip_address is recorded", () => {
    return auditLog.ip_address !== undefined && auditLog.ip_address.length > 0;
  });

  TestValidator.predicate("user_agent is recorded", () => {
    return auditLog.user_agent !== undefined && auditLog.user_agent.length > 0;
  });

  // Step 11: Validate timestamps are present
  TestValidator.predicate("created_at timestamp is present", () => {
    return auditLog.created_at !== undefined && auditLog.created_at.length > 0;
  });

  // Step 12: Validate new_state contains post-action state
  TestValidator.predicate("new_state is populated", () => {
    return (
      auditLog.new_state !== undefined &&
      Object.keys(auditLog.new_state).length > 0
    );
  });
}
