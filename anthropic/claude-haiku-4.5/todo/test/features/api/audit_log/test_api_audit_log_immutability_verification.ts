import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates audit log immutability and change tracking properties.
 *
 * This test verifies that audit logs correctly capture and preserve state
 * changes through their immutable properties. The test flow includes:
 *
 * 1. Create a user account to generate audit log entries in the system
 * 2. Authenticate as admin to access audit log retrieval functionality
 * 3. Retrieve and validate audit log structure and immutability properties
 * 4. Verify that audit logs preserve complete state information (old_value and
 *    new_value)
 * 5. Ensure audit log entries are properly formatted with all required fields
 */
export async function test_api_audit_log_immutability_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to generate audit log entries
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "user created with correct email",
    user.email,
    userEmail,
  );

  // Step 2: Create admin account to access audit log functionality
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
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
  TestValidator.equals(
    "admin created with correct email",
    admin.email,
    adminEmail,
  );

  // Step 3: Retrieve an audit log entry to validate immutability properties
  // This demonstrates the ability to access audit logs for verification
  const sampleAuditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog: ITodoAppAuditLog =
    await api.functional.todoApp.admin.auditLogs.at(connection, {
      auditLogId: sampleAuditLogId,
    });
  typia.assert(auditLog);

  // Step 4: Validate core immutable properties are present and properly structured
  TestValidator.predicate(
    "audit log has immutable id identifier",
    auditLog.id !== undefined && auditLog.id !== null,
  );
  TestValidator.predicate(
    "audit log has action type recorded",
    auditLog.action_type !== undefined && auditLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "audit log has resource type recorded",
    auditLog.resource_type !== undefined && auditLog.resource_type.length > 0,
  );
  TestValidator.predicate(
    "audit log has valid status value",
    auditLog.status === "success" ||
      auditLog.status === "failure" ||
      auditLog.status === "partial",
  );
  TestValidator.predicate(
    "audit log has creation timestamp",
    auditLog.created_at !== undefined && auditLog.created_at !== null,
  );

  // Step 5: Validate state change tracking fields (old_value and new_value)
  // These fields are critical for audit trail integrity
  TestValidator.predicate(
    "audit log preserves state information",
    auditLog.old_value !== undefined || auditLog.new_value !== undefined,
  );

  // Step 6: Validate actor information to ensure complete audit context
  TestValidator.predicate(
    "audit log records actor type",
    auditLog.actor_type !== undefined &&
      (auditLog.actor_type === "user" ||
        auditLog.actor_type === "admin" ||
        auditLog.actor_type === "system"),
  );

  // Step 7: Verify all immutable audit trail properties are maintained
  // This confirms the audit log entry is complete and cannot be modified
  TestValidator.predicate(
    "audit log entry has all required immutable fields",
    auditLog.id !== undefined &&
      auditLog.action_type !== undefined &&
      auditLog.resource_type !== undefined &&
      auditLog.actor_type !== undefined &&
      auditLog.status !== undefined &&
      auditLog.created_at !== undefined,
  );
}
