import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";

/**
 * Test admin retrieval of system backups list with complete metadata.
 *
 * This test validates the admin backup list retrieval workflow:
 *
 * 1. Admin authenticates to the system with valid credentials
 * 2. Admin creates multiple system backup snapshots
 * 3. Admin retrieves backup summary data from the backups endpoint
 * 4. Validates each backup record includes all required metadata:
 *
 *    - Unique identifier (UUID format)
 *    - Creation timestamp (ISO 8601 date-time format)
 *    - Backup size in bytes (non-negative integer)
 *    - Verification status (boolean indicating if backup is valid/restorable)
 *    - Current status (one of: pending, in_progress, completed, failed)
 * 5. Confirms admin role provides access to admin-only backup endpoints
 */
export async function test_api_backups_list_retrieval_admin_access(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(8) + "1A";

  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(adminAuth);

  TestValidator.predicate(
    "admin authentication returns valid authorization token",
    () =>
      adminAuth.token.access !== undefined && adminAuth.token.access.length > 0,
  );

  // Step 2: Create a system backup
  const backup: ITodoAppBackup =
    await api.functional.todoApp.admin.backups.create(connection);
  typia.assert(backup);

  TestValidator.predicate(
    "backup creation returns valid backup object",
    () => backup.id !== undefined && backup.created_at !== undefined,
  );

  // Step 3: Retrieve backup summary data
  const backupSummary: ITodoAppBackup.ISummary =
    await api.functional.todoApp.admin.backups.index(connection);
  typia.assert(backupSummary);

  // Step 4: Validate backup contains all required metadata

  // Validate backup ID is in UUID format
  TestValidator.predicate("backup ID is valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      backupSummary.id,
    ),
  );

  // Validate creation timestamp is ISO 8601 format
  TestValidator.predicate(
    "backup created_at is valid ISO 8601 datetime",
    () => {
      const createdDate = new Date(backupSummary.created_at);
      return !isNaN(createdDate.getTime());
    },
  );

  // Validate backup size is non-negative integer
  TestValidator.predicate(
    "backup size_bytes is non-negative integer",
    () =>
      Number.isInteger(backupSummary.size_bytes) &&
      backupSummary.size_bytes >= 0,
  );

  // Validate verification status is boolean
  TestValidator.predicate(
    "backup is_verified is boolean",
    () => typeof backupSummary.is_verified === "boolean",
  );

  // Validate status is one of valid statuses
  TestValidator.predicate("backup status is valid completion state", () =>
    ["pending", "in_progress", "completed", "failed"].includes(
      backupSummary.status,
    ),
  );

  // Step 5: Verify metadata completeness
  TestValidator.predicate(
    "backup summary contains complete metadata",
    () =>
      backupSummary.id !== undefined &&
      backupSummary.created_at !== undefined &&
      backupSummary.size_bytes !== undefined &&
      backupSummary.is_verified !== undefined &&
      backupSummary.status !== undefined,
  );

  // Step 6: Verify admin authorization successful
  TestValidator.equals(
    "admin email matches authenticated admin",
    adminAuth.email,
    adminEmail,
  );

  TestValidator.predicate(
    "admin has active status for system access",
    () => adminAuth.status === "active",
  );
}
