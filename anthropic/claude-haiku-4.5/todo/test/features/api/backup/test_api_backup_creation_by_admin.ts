import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";

/**
 * Validate administrator backup creation workflow.
 *
 * Tests that an authenticated administrator can successfully create a new
 * system backup. This test covers the complete workflow from admin registration
 * and authentication through backup initiation and response validation.
 *
 * Process:
 *
 * 1. Register a new admin account with valid email and password
 * 2. Verify admin receives proper authentication tokens
 * 3. Initiate backup creation through admin endpoint
 * 4. Validate backup response contains all required metadata
 * 5. Verify backup structure matches ITodoAppBackup interface
 *
 * Business Context: Administrators need to perform manual backup operations for
 * disaster recovery preparation. The system must ensure only authenticated
 * admins can trigger backups and that backups are properly tracked with
 * creation timestamps and status information.
 */
export async function test_api_backup_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  // Generate admin credentials with valid email format
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidAdminPassword123";

  // Register new admin with credentials
  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(adminAuth);

  // Verify admin authentication response contains required fields
  TestValidator.equals(
    "admin email matches registration input",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.equals("admin status is active", adminAuth.status, "active");
  TestValidator.predicate("admin id is not empty", adminAuth.id.length > 0);

  // Verify token structure in response
  const token: IAuthorizationToken = adminAuth.token;
  typia.assert(token);
  TestValidator.predicate("access token is not empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is not empty",
    token.refresh.length > 0,
  );

  // Step 2: Initiate backup creation as authenticated admin
  // Admin is now authenticated (connection has authorization header set)
  const backup: ITodoAppBackup =
    await api.functional.todoApp.admin.backups.create(connection);
  typia.assert(backup);

  // Step 3: Validate backup response structure and metadata
  // typia.assert(backup) already validates all type requirements including UUID format and date-time format
  // Now focus on business logic validation

  TestValidator.predicate("backup id is not empty", backup.id.length > 0);

  // Verify backup creation timestamp exists
  TestValidator.predicate(
    "backup created_at is not empty",
    backup.created_at.length > 0,
  );

  // Verify backup size is a non-negative integer
  TestValidator.predicate(
    "backup size_bytes is non-negative",
    backup.size_bytes >= 0,
  );
  TestValidator.predicate(
    "backup size_bytes is integer",
    Number.isInteger(backup.size_bytes),
  );

  // Verify backup has verification status
  TestValidator.predicate(
    "backup is_verified is boolean",
    typeof backup.is_verified === "boolean",
  );

  // Verify backup has valid status string
  TestValidator.predicate(
    "backup status is not empty",
    backup.status.length > 0,
  );
  TestValidator.predicate(
    "backup status is string",
    typeof backup.status === "string",
  );

  // Step 4: Verify backup is in expected initial state
  // Status should indicate backup is in one of the valid states
  const validStatuses = ["pending", "in_progress", "completed", "failed"];
  TestValidator.predicate(
    "backup status is one of valid values",
    validStatuses.includes(backup.status),
  );

  // Step 5: Verify completed_at is optional and properly typed when present
  if (backup.completed_at !== null && backup.completed_at !== undefined) {
    TestValidator.predicate(
      "backup completed_at is not empty when present",
      backup.completed_at.length > 0,
    );
  }
}
