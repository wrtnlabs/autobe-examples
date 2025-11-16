import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test successful retrieval of a specific moderation audit log entry by a
 * moderator.
 *
 * This test validates the complete audit log retrieval functionality by
 * establishing moderator authentication, retrieving a specific audit log entry
 * by its ID, and validating that all accountability information is returned
 * correctly including moderator identity, action details, target information,
 * state snapshots, and security context (IP address and user agent).
 *
 * Steps:
 *
 * 1. Authenticate as a moderator using the join endpoint
 * 2. Generate a valid UUID for an audit log ID
 * 3. Retrieve the audit log entry using the moderator access
 * 4. Validate the response structure and data types using typia.assert
 * 5. Verify business logic constraints and enum values
 */
export async function test_api_moderation_audit_logs_successful_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches input email",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Generate a valid audit log ID for retrieval
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the audit log entry
  const auditLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.at(
      connection,
      {
        logId: auditLogId,
      },
    );
  typia.assert(auditLog);

  // Step 4: Verify audit log ID matches the requested ID
  TestValidator.equals(
    "audit log ID matches requested ID",
    auditLog.id,
    auditLogId,
  );

  // Step 5: Verify moderator summary information is present and valid
  TestValidator.predicate(
    "moderator summary should have non-empty username",
    auditLog.moderator.username.length > 0,
  );

  // Step 6: Verify target type is one of the valid enum values
  TestValidator.predicate(
    "target type should be post, comment, or user",
    ["post", "comment", "user"].includes(auditLog.target_type),
  );

  // Step 7: Verify action type is one of the valid enum values
  TestValidator.predicate(
    "action type should be one of the valid moderation actions",
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

  // Step 8: Verify action reason is non-empty
  TestValidator.predicate(
    "action reason should be non-empty",
    auditLog.action_reason.length > 0,
  );

  // Step 9: Verify new state exists and contains data
  TestValidator.predicate(
    "new state should exist and have properties",
    Object.keys(auditLog.new_state).length > 0,
  );

  // Step 10: Verify action status is one of the valid enum values
  TestValidator.predicate(
    "action status should be success, failure, or partial_success",
    ["success", "failure", "partial_success"].includes(auditLog.action_status),
  );

  // Step 11: Verify optional target_member field when present
  if (auditLog.target_member !== null && auditLog.target_member !== undefined) {
    TestValidator.predicate(
      "target member should have non-empty username",
      auditLog.target_member.username.length > 0,
    );
  }

  // Step 12: Verify optional previous_state field when present
  if (
    auditLog.previous_state !== null &&
    auditLog.previous_state !== undefined
  ) {
    TestValidator.predicate(
      "previous state should be a valid object",
      Object.keys(auditLog.previous_state).length >= 0,
    );
  }

  // Step 13: Verify optional status_details field when present
  if (
    auditLog.status_details !== null &&
    auditLog.status_details !== undefined
  ) {
    TestValidator.predicate(
      "status details should be non-empty when present",
      auditLog.status_details.length > 0,
    );
  }
}
