import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

/**
 * Test that audit log entries capture security-relevant context including IP
 * address and user agent information.
 *
 * This test validates that the audit logging system properly captures security
 * context data when admin users perform actions. The audit log should record:
 *
 * - IP address from which the action originated (ip_address field)
 * - User agent/browser information (user_agent field)
 * - Complete action metadata for security analysis and suspicious activity
 *   detection
 *
 * Test workflow:
 *
 * 1. Create a new admin account via /auth/admin/join endpoint
 * 2. Verify the admin was created successfully with proper authorization
 * 3. Validate that audit log entries include security context fields
 * 4. Confirm ip_address and user_agent fields are properly defined in audit logs
 */
export async function test_api_audit_log_security_context_capture(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account which generates an audit log entry
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const authorizedAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(authorizedAdmin);

  // Validate that the authorized admin response contains proper authentication token
  TestValidator.predicate(
    "admin authorization should include access token",
    authorizedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin authorization should include refresh token",
    authorizedAdmin.token.refresh.length > 0,
  );

  // Step 2: Retrieve an audit log entry to verify security context capture
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  const auditLog: ITodoAppAuditLog =
    await api.functional.todoApp.admin.auditLogs.at(connection, {
      auditLogId: auditLogId,
    });
  typia.assert(auditLog);

  // Step 3: Validate security context fields are captured
  // Verify that ip_address field exists (may be null for some operations)
  TestValidator.predicate(
    "audit log should have ip_address field for security analysis",
    auditLog.hasOwnProperty("ip_address"),
  );

  // Verify that user_agent field exists (may be null for some operations)
  TestValidator.predicate(
    "audit log should have user_agent field for client identification",
    auditLog.hasOwnProperty("user_agent"),
  );

  // Step 4: Validate other security-relevant fields
  TestValidator.predicate(
    "audit log should have action_type for identifying the action",
    auditLog.action_type.length > 0,
  );

  TestValidator.predicate(
    "audit log should have actor_type for identifying who performed the action",
    auditLog.actor_type.length > 0,
  );

  TestValidator.predicate(
    "audit log should have status indicating operation outcome",
    auditLog.status.length > 0,
  );

  TestValidator.predicate(
    "audit log should have created_at timestamp",
    auditLog.created_at.length > 0,
  );

  // Step 5: Verify that the status field contains expected values
  TestValidator.predicate(
    "audit log status should be one of: success, failure, partial",
    ["success", "failure", "partial"].includes(auditLog.status),
  );

  // Step 6: Validate resource type for audit context
  TestValidator.predicate(
    "audit log should have resource_type",
    auditLog.resource_type.length > 0,
  );
}
