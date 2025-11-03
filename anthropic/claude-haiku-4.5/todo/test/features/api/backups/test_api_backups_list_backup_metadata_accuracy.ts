import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";

/**
 * Test that backup metadata returned in the list is accurate and reflects
 * actual backup properties.
 *
 * This test verifies that the backup listing API returns accurate metadata for
 * backup snapshots. The admin authentication is established first, then a
 * backup is created with known properties. The backup list endpoint is called
 * and the returned backup's metadata is validated to ensure:
 *
 * - Creation timestamp is accurately reported
 * - Size in bytes is a positive number
 * - Verification status correctly indicates if backup is valid and restorable
 * - Completion status shows backup process state
 *
 * Test Flow:
 *
 * 1. Admin registers with email and password
 * 2. Create backup snapshot
 * 3. Retrieve backup from list endpoint
 * 4. Validate all backup metadata properties are accurate and populated
 * 5. Verify metadata types and values match expectations
 */
export async function test_api_backups_list_backup_metadata_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";
  const adminUser = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      password_confirmation: adminPassword,
    } satisfies ITodoAppAdmin.IRegister,
  });
  typia.assert(adminUser);
  TestValidator.predicate(
    "admin registered successfully",
    adminUser.id !== null && adminUser.id !== undefined,
  );

  // Step 2: Create backup snapshot
  const createdBackup =
    await api.functional.todoApp.admin.backups.create(connection);
  typia.assert(createdBackup);

  TestValidator.predicate(
    "created backup has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdBackup.id,
    ),
  );
  TestValidator.predicate(
    "created backup has size greater than zero",
    createdBackup.size_bytes > 0,
  );

  // Step 3: Retrieve backup from list endpoint
  const backupSummary =
    await api.functional.todoApp.admin.backups.index(connection);
  typia.assert(backupSummary);

  // Step 4: Validate metadata accuracy
  TestValidator.predicate(
    "backup summary id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      backupSummary.id,
    ),
  );

  TestValidator.predicate(
    "backup summary has created_at timestamp",
    backupSummary.created_at !== null &&
      backupSummary.created_at !== undefined &&
      backupSummary.created_at.length > 0,
  );

  TestValidator.predicate(
    "backup summary size_bytes is positive number",
    typeof backupSummary.size_bytes === "number" &&
      backupSummary.size_bytes > 0,
  );

  TestValidator.predicate(
    "backup summary has is_verified boolean status",
    typeof backupSummary.is_verified === "boolean",
  );

  TestValidator.predicate(
    "backup summary has status string",
    typeof backupSummary.status === "string" && backupSummary.status.length > 0,
  );

  // Step 5: Validate timestamp format (ISO 8601)
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(backupSummary.created_at),
  );

  // Step 6: Validate status values are valid backup states
  const validStatuses = ["pending", "in_progress", "completed", "failed"];
  TestValidator.predicate(
    "backup status is one of valid states",
    validStatuses.includes(backupSummary.status),
  );

  // Step 7: Verify metadata completeness
  TestValidator.predicate(
    "backup summary contains all required metadata",
    backupSummary.id !== null &&
      backupSummary.id !== undefined &&
      backupSummary.created_at !== null &&
      backupSummary.created_at !== undefined &&
      backupSummary.size_bytes !== null &&
      backupSummary.size_bytes !== undefined &&
      backupSummary.is_verified !== null &&
      backupSummary.is_verified !== undefined &&
      backupSummary.status !== null &&
      backupSummary.status !== undefined,
  );
}
