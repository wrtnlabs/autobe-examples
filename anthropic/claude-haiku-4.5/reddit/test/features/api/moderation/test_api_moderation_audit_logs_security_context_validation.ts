import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that retrieved audit log entries include complete security context
 * information.
 *
 * This test validates that moderation audit logs capture and expose complete
 * security context details for accountability and fraud detection. The security
 * context includes the moderator's IP address (IPv4 format) and user agent
 * (browser/device information) from when the action was performed.
 *
 * Test flow:
 *
 * 1. Register and authenticate a new moderator account
 * 2. Retrieve an audit log entry created during the moderator's actions
 * 3. Validate security context fields are properly formatted and populated:
 *
 *    - Ip_address contains valid IPv4 format
 *    - User_agent contains non-empty browser/device information
 * 4. Ensure both fields serve audit trail and fraud detection purposes
 */
export async function test_api_moderation_audit_logs_security_context_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreateData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(15),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const authorizedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorCreateData,
    },
  );
  typia.assert(authorizedModerator);

  // Validate moderator authorization response
  TestValidator.predicate(
    "moderator should be authenticated with access token",
    authorizedModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "moderator should have valid email",
    authorizedModerator.email === moderatorEmail,
  );

  // Step 2: Retrieve an audit log entry
  // Generate a random audit log ID (in real scenario, this would be from a created log)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  const auditLog =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.at(
      connection,
      {
        logId: auditLogId,
      },
    );
  typia.assert(auditLog);

  // Step 3: Validate security context information
  // Validate IP address format (IPv4)
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  TestValidator.predicate(
    "audit log should contain valid IPv4 address",
    ipv4Regex.test(auditLog.ip_address),
  );

  // Validate IP address field exists and is properly formatted
  TestValidator.predicate(
    "ip_address field should be populated",
    auditLog.ip_address.length > 0,
  );

  // Validate user agent information is present
  TestValidator.predicate(
    "user_agent field should be populated with device/browser information",
    auditLog.user_agent.length > 0,
  );

  // Validate user agent respects maximum length constraint
  TestValidator.predicate(
    "user_agent should not exceed maximum length of 500 characters",
    auditLog.user_agent.length <= 500,
  );

  // Step 4: Validate complete security context structure
  TestValidator.predicate(
    "audit log should have moderator information",
    auditLog.moderator !== undefined && auditLog.moderator !== null,
  );

  TestValidator.predicate(
    "audit log should have target ID for resource identification",
    auditLog.target_id.length > 0,
  );

  TestValidator.predicate(
    "audit log should have action type for accountability",
    auditLog.action_type.length > 0,
  );

  // Validate action reason is properly documented
  TestValidator.predicate(
    "audit log should have action reason for transparency",
    auditLog.action_reason.length > 0,
  );

  // Validate action status tracking
  TestValidator.predicate(
    "audit log should have action status indicating result",
    ["success", "failure", "partial_success"].includes(auditLog.action_status),
  );

  // Validate timestamps are in ISO 8601 format
  TestValidator.predicate(
    "created_at should be valid ISO 8601 timestamp",
    !isNaN(new Date(auditLog.created_at).getTime()),
  );
}
