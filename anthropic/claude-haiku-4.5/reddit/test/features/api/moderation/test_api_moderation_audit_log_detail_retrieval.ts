import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test retrieval of detailed information about a specific moderation audit log
 * entry.
 *
 * This test validates the GET
 * /communityPlatform/administrator/moderationAuditLogs/{logId} endpoint by
 * verifying that providing a valid audit log ID returns the complete and
 * immutable audit record including all accountability information, state
 * snapshots, security context, and action metadata.
 *
 * The scenario performs the following steps:
 *
 * 1. Create an administrator account to authenticate and authorize the request
 * 2. Generate a random valid UUID to use as the audit log ID
 * 3. Retrieve the detailed audit log entry using the logId parameter
 * 4. Validate that the response contains all expected audit log fields
 * 5. Verify moderator identity and action information integrity
 * 6. Confirm security context (IP address and user agent) is recorded
 * 7. Validate timestamp and status fields are present and accurate
 */
export async function test_api_moderation_audit_log_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://platform.example.com/admin/login",
        referrer: "https://platform.example.com",
        ip: "192.168.1.100",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a valid UUID for the audit log ID
  const logId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the detailed audit log entry
  const auditLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
      connection,
      {
        logId: logId,
      },
    );

  // Step 4: Validate complete response structure through typia assertion
  typia.assert(auditLog);

  // Step 5: Verify moderator identity is present and has username
  TestValidator.predicate(
    "moderator username is documented",
    auditLog.moderator.username.length > 0,
  );

  // Verify action type is one of the valid moderation actions
  TestValidator.predicate(
    "action type is valid moderation action",
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

  // Verify action reason is provided
  TestValidator.predicate(
    "action reason is documented",
    auditLog.action_reason.length > 0,
  );

  // Step 6: Verify security context is recorded
  TestValidator.predicate(
    "security context includes IP address",
    auditLog.ip_address.length > 0,
  );

  TestValidator.predicate(
    "security context includes user agent",
    auditLog.user_agent.length > 0,
  );

  // Step 7: Validate action status field
  TestValidator.predicate(
    "action status is valid",
    ["success", "failure", "partial_success"].includes(auditLog.action_status),
  );

  // Verify status_details is present for non-success actions
  if (auditLog.action_status !== "success") {
    TestValidator.predicate(
      "status details provided for non-success actions",
      auditLog.status_details !== undefined && auditLog.status_details !== null,
    );
  }

  // Verify target information reflects action scope
  TestValidator.predicate(
    "target type is documented",
    ["post", "comment", "user"].includes(auditLog.target_type),
  );

  // Verify state tracking information for reversibility analysis
  TestValidator.predicate(
    "new state is recorded for action tracking",
    Object.keys(auditLog.new_state).length > 0,
  );

  // Verify requested audit log matches returned data
  TestValidator.equals(
    "returned audit log id matches request",
    auditLog.id,
    logId,
  );
}
