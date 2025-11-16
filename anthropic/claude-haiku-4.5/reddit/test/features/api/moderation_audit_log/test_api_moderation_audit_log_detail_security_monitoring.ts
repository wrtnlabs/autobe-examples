import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that moderation audit log details include security monitoring
 * information (ip_address and user_agent).
 *
 * This test validates that administrators can retrieve detailed audit log
 * entries that capture security context for investigating suspicious moderator
 * behavior. The audit log response must include IPv4 address and user agent
 * information to enable detection of coordinated moderation abuse or unusual
 * activity patterns.
 *
 * Test flow:
 *
 * 1. Create administrator account to establish authentication context
 * 2. Retrieve a moderation audit log by ID to verify response structure
 * 3. Validate that ip_address field is present and contains valid IPv4 format
 * 4. Validate that user_agent field is present and contains browser/client
 *    information
 * 5. Confirm both fields are immutable and preserved in audit records
 * 6. Verify security context enables abuse detection through IP and user agent
 *    tracking
 */
export async function test_api_moderation_audit_log_detail_security_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Retrieve a moderation audit log using valid log ID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
      connection,
      { logId: auditLogId },
    );
  typia.assert(auditLog);

  // Step 3: Validate that ip_address field contains valid IPv4 format
  TestValidator.predicate(
    "ip_address field is present and non-empty",
    auditLog.ip_address !== undefined &&
      auditLog.ip_address !== null &&
      auditLog.ip_address.length > 0,
  );

  TestValidator.predicate(
    "ip_address follows valid IPv4 format",
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(
      auditLog.ip_address,
    ),
  );

  // Step 4: Validate that user_agent field contains browser/client information
  TestValidator.predicate(
    "user_agent field is present and non-empty",
    auditLog.user_agent !== undefined &&
      auditLog.user_agent !== null &&
      auditLog.user_agent.length > 0,
  );

  TestValidator.predicate(
    "user_agent respects maximum length constraint",
    auditLog.user_agent.length <= 500,
  );

  // Step 5: Confirm both fields are immutable and preserved in audit records
  TestValidator.predicate(
    "audit log ID is immutable",
    auditLog.id !== undefined && auditLog.id === auditLogId,
  );

  TestValidator.predicate(
    "security context fields are complete",
    auditLog.ip_address !== undefined &&
      auditLog.user_agent !== undefined &&
      auditLog.created_at !== undefined,
  );

  // Step 6: Verify security context enables abuse detection
  TestValidator.predicate(
    "moderator information is captured for accountability",
    auditLog.moderator !== undefined &&
      auditLog.moderator.id !== undefined &&
      auditLog.moderator.username !== undefined,
  );

  TestValidator.predicate(
    "action details are documented",
    auditLog.action_type !== undefined &&
      auditLog.action_reason !== undefined &&
      auditLog.action_reason.length > 0,
  );

  TestValidator.predicate(
    "action status is recorded",
    auditLog.action_status !== undefined &&
      (auditLog.action_status === "success" ||
        auditLog.action_status === "failure" ||
        auditLog.action_status === "partial_success"),
  );
}
