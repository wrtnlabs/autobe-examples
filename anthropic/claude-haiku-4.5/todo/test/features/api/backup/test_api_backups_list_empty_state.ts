import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";

/**
 * Tests retrieving a backup summary from the backups list endpoint.
 *
 * This test validates the backup retrieval functionality for administrators. It
 * ensures that authenticated admins can successfully retrieve backup
 * information from the system. The endpoint returns backup metadata including
 * creation timestamp, size, verification status, and completion status.
 *
 * Test Flow:
 *
 * 1. Create an admin account and authenticate
 * 2. Request backup information from the endpoint
 * 3. Validate the response structure and data integrity
 */
export async function test_api_backups_list_empty_state(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

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

  // Step 2: Request backup information
  const backup: ITodoAppBackup.ISummary =
    await api.functional.todoApp.admin.backups.index(connection);
  typia.assert(backup);

  // Step 3: Validate backup response structure and data
  TestValidator.predicate(
    "backup id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      backup.id,
    ),
  );

  TestValidator.predicate(
    "backup created_at is valid ISO date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(backup.created_at),
  );

  TestValidator.predicate(
    "backup size_bytes is non-negative integer",
    typeof backup.size_bytes === "number" &&
      backup.size_bytes >= 0 &&
      Number.isInteger(backup.size_bytes),
  );

  TestValidator.predicate(
    "backup is_verified is boolean",
    typeof backup.is_verified === "boolean",
  );

  TestValidator.predicate(
    "backup status is non-empty string",
    typeof backup.status === "string" && backup.status.length > 0,
  );
}
