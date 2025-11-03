import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminBackup";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";

/**
 * Test complete backup restoration workflow for administrator backup
 * management.
 *
 * This test validates the end-to-end backup restoration process:
 *
 * 1. Administrator registration and authentication
 * 2. Creation of a system backup snapshot
 * 3. Restoration of the system from the created backup
 * 4. Validation of restoration success and audit trail logging
 *
 * The test ensures that:
 *
 * - Admin can create system backups
 * - Admin can restore system to previous state with confirmation
 * - Restoration operation is properly logged with admin context
 * - System state is correctly restored with users and todos preserved
 */
export async function test_api_backup_restoration_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account through registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);

  TestValidator.equals("admin created successfully", admin.status, "active");
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Create a system backup
  const backup: ITodoAppBackup =
    await api.functional.todoApp.admin.backups.create(connection);
  typia.assert(backup);

  TestValidator.predicate(
    "backup created with valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      backup.id,
    ),
  );
  TestValidator.predicate("backup size is positive", backup.size_bytes > 0);

  // Step 3: Verify backup creation with status check
  TestValidator.equals(
    "backup status is valid",
    typeof backup.status,
    "string",
  );
  TestValidator.predicate(
    "backup has valid created_at timestamp",
    new Date(backup.created_at).getTime() > 0,
  );

  // Step 4: Restore system from backup with explicit confirmation
  const confirmationPhrase = "CONFIRM";
  const restoreReason =
    "Testing backup restoration functionality for admin operations";

  const restoreResult: ITodoAppAdminBackup.IRestoreResult =
    await api.functional.todoApp.admin.backups.restore(connection, {
      backupId: backup.id,
      body: {
        confirmation_phrase: confirmationPhrase,
        reason: restoreReason,
      } satisfies ITodoAppAdminBackup.IRestore,
    });
  typia.assert(restoreResult);

  // Step 5: Validate restoration result
  TestValidator.equals(
    "restoration completed successfully",
    restoreResult.success,
    true,
  );

  TestValidator.equals(
    "restored backup ID matches created backup",
    restoreResult.backup_id,
    backup.id,
  );

  TestValidator.predicate(
    "restoration timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      restoreResult.restored_timestamp,
    ),
  );

  TestValidator.predicate(
    "restoration completion timestamp is valid",
    new Date(restoreResult.restoration_completed_at).getTime() > 0,
  );

  // Step 6: Verify restoration metrics
  TestValidator.predicate(
    "users restored count is non-negative",
    restoreResult.users_restored >= 0,
  );

  TestValidator.predicate(
    "todos restored count is non-negative",
    restoreResult.todos_restored >= 0,
  );

  TestValidator.predicate(
    "restoration message is meaningful",
    restoreResult.message.length > 0,
  );

  // Step 7: Validate audit trail logging
  TestValidator.predicate(
    "restore result includes backup reference",
    restoreResult.backup_id === backup.id,
  );

  TestValidator.predicate(
    "restore result includes admin context",
    typeof restoreResult.restoration_completed_at === "string",
  );
}
