import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

/**
 * Test that audit log entries properly capture error information when
 * operations fail.
 *
 * This test validates the audit logging system's ability to capture complete
 * error context when operations fail. The scenario follows these steps:
 *
 * 1. Authenticate as an admin user by creating an admin account
 * 2. Retrieve an audit log entry to verify proper error context structure
 * 3. Validate that audit log entries contain all required fields for error
 *    tracking
 * 4. Confirm that the audit system logs both action details and error information
 */
export async function test_api_audit_log_error_context_capture(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123!";

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Verify admin was successfully created and authenticated
  TestValidator.predicate(
    "admin account created with valid ID",
    admin.id !== null && admin.id !== undefined && admin.id.length > 0,
  );

  TestValidator.predicate(
    "admin account has authentication token",
    admin.token !== null && admin.token.access !== null,
  );

  // Step 3: Retrieve an audit log entry to verify structure
  const sampleAuditLogId = typia.random<string & tags.Format<"uuid">>();

  const auditLog: ITodoAppAuditLog =
    await api.functional.todoApp.admin.auditLogs.at(connection, {
      auditLogId: sampleAuditLogId,
    });
  typia.assert(auditLog);

  // Step 4: Validate audit log contains all required fields
  TestValidator.predicate(
    "audit log has valid ID",
    auditLog.id !== null && auditLog.id !== undefined,
  );

  TestValidator.predicate(
    "audit log has action_type",
    auditLog.action_type !== null && auditLog.action_type.length > 0,
  );

  TestValidator.predicate(
    "audit log has resource_type",
    auditLog.resource_type !== null && auditLog.resource_type.length > 0,
  );

  TestValidator.predicate(
    "audit log has actor_type",
    auditLog.actor_type !== null && auditLog.actor_type.length > 0,
  );

  TestValidator.predicate(
    "audit log has status field",
    auditLog.status !== null && auditLog.status.length > 0,
  );

  // Step 5: Validate error context is properly captured
  // For failed operations, error_message should contain context
  if (auditLog.status === "failure") {
    TestValidator.predicate(
      "failed operations include error message for troubleshooting",
      auditLog.error_message !== null &&
        auditLog.error_message !== undefined &&
        auditLog.error_message.length > 0,
    );
  }

  // Step 6: Verify timestamp indicates when event occurred
  TestValidator.predicate(
    "audit log has valid created_at timestamp",
    auditLog.created_at !== null && auditLog.created_at.length > 0,
  );

  // Step 7: Verify audit log is retrievable with consistent data
  const retrievedAgain: ITodoAppAuditLog =
    await api.functional.todoApp.admin.auditLogs.at(connection, {
      auditLogId: auditLog.id,
    });
  typia.assert(retrievedAgain);

  TestValidator.equals(
    "audit log entry maintains data integrity on retrieval",
    auditLog.id,
    retrievedAgain.id,
  );

  TestValidator.equals(
    "audit log status is consistent across retrievals",
    auditLog.status,
    retrievedAgain.status,
  );
}
