import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderation_audit_logs_post_removal_action(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `mod_${RandomGenerator.alphabets(8)}`;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: "TestPassword123!",
      href: "https://platform.example.com/auth/register",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });

  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== undefined && moderator.email_verified === false,
  );

  // Step 2: Retrieve a moderation audit log entry for post removal
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  const auditLog =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.at(
      connection,
      {
        logId: auditLogId,
      },
    );

  typia.assert(auditLog);

  // Step 3: Validate the audit log contains post removal action details
  TestValidator.equals(
    "action type is remove_post",
    auditLog.action_type,
    "remove_post",
  );

  TestValidator.equals("target type is post", auditLog.target_type, "post");

  TestValidator.predicate(
    "moderator information is present with valid ID and username",
    auditLog.moderator !== undefined &&
      auditLog.moderator.id !== undefined &&
      auditLog.moderator.username !== undefined &&
      auditLog.moderator.username.length > 0,
  );

  TestValidator.predicate(
    "action reason is meaningful and within length constraints",
    auditLog.action_reason !== undefined &&
      auditLog.action_reason.length >= 1 &&
      auditLog.action_reason.length <= 500,
  );

  // Step 4: Validate state snapshots for post removal context
  TestValidator.predicate(
    "previous state contains post content information",
    auditLog.previous_state !== null &&
      auditLog.previous_state !== undefined &&
      typeof auditLog.previous_state === "object",
  );

  TestValidator.predicate(
    "new state reflects post state after removal",
    auditLog.new_state !== undefined &&
      typeof auditLog.new_state === "object" &&
      Object.keys(auditLog.new_state).length > 0,
  );

  // Step 5: Validate security audit information is captured
  TestValidator.predicate(
    "IP address is recorded for audit trail",
    auditLog.ip_address !== undefined && auditLog.ip_address.length > 0,
  );

  TestValidator.predicate(
    "user agent is captured for security context",
    auditLog.user_agent !== undefined &&
      auditLog.user_agent.length > 0 &&
      auditLog.user_agent.length <= 500,
  );

  // Step 6: Validate action status represents valid moderation state
  TestValidator.predicate(
    "action status is one of the valid moderation outcomes",
    ["success", "failure", "partial_success"].includes(auditLog.action_status),
  );

  // Step 7: Validate timestamp indicates when action was recorded
  TestValidator.predicate(
    "created_at timestamp is present",
    auditLog.created_at !== undefined && auditLog.created_at.length > 0,
  );

  // Step 8: Verify target ID identifies the post being removed
  TestValidator.predicate(
    "target_id is present and valid",
    auditLog.target_id !== undefined && auditLog.target_id.length > 0,
  );

  // Step 9: Validate optional target member field when present
  if (auditLog.target_member !== null && auditLog.target_member !== undefined) {
    TestValidator.predicate(
      "target member has valid ID and username when provided",
      auditLog.target_member.id !== undefined &&
        auditLog.target_member.username !== undefined &&
        auditLog.target_member.username.length > 0,
    );
  }

  // Step 10: Validate status details for failed actions
  if (
    auditLog.action_status === "failure" ||
    auditLog.action_status === "partial_success"
  ) {
    TestValidator.predicate(
      "status details provided for non-success actions",
      auditLog.status_details !== undefined &&
        auditLog.status_details.length > 0,
    );
  }
}
