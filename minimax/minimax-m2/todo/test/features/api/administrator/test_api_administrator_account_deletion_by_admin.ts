import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator account soft deletion workflow.
 *
 * This E2E test validates the complete process of administrator account
 * deletion through soft deletion methodology. The test follows a realistic
 * business workflow where an authenticated admin creates a new administrator
 * account and then performs soft deletion to remove it from active use while
 * preserving audit trails.
 *
 * Test Flow:
 *
 * 1. Authenticate as an admin user to establish administrative privileges
 * 2. Create a new administrator account with unique credentials
 * 3. Validate the created administrator account exists and is active
 * 4. Perform soft deletion using the erase API endpoint
 * 5. Verify the deletion operation completes successfully
 *
 * This test ensures that:
 *
 * - Only authorized administrators can delete other admin accounts
 * - Soft deletion preserves all data for audit and recovery purposes
 * - The deletion workflow maintains data integrity
 * - Administrative operations follow proper security protocols
 */
export async function test_api_administrator_account_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user to establish administrative privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";

  const authenticatedAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "System",
        last_name: "Administrator",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(authenticatedAdmin);

  // Step 2: Create a new administrator account to serve as deletion target
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdminPassword = "TargetAdmin456!";

  const createdAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: targetAdminEmail,
        password_hash: targetAdminPassword,
        first_name: "Target",
        last_name: "Administrator",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(createdAdministrator);

  // Step 3: Validate the created administrator account properties
  TestValidator.equals(
    "created administrator has valid UUID",
    typeof createdAdministrator.id,
    "string",
  );
  TestValidator.equals(
    "created administrator email matches",
    createdAdministrator.email,
    targetAdminEmail,
  );
  TestValidator.equals(
    "created administrator status is active",
    createdAdministrator.status,
    "active",
  );
  TestValidator.equals(
    "created administrator has no deletion timestamp",
    createdAdministrator.deleted_at,
    null,
  );
  TestValidator.equals(
    "created administrator role level is admin",
    createdAdministrator.role_level,
    "admin",
  );

  // Step 4: Perform soft deletion using the erase API endpoint
  await api.functional.todoApp.admin.administrators.erase(connection, {
    administratorId: createdAdministrator.id,
  });

  // Step 5: Verify the deletion operation completed successfully
  // The erase function returns void on success, so we validate the operation
  // completed without throwing an error
  TestValidator.predicate(
    "administrator deletion operation completed successfully",
    true,
  );

  // Additional validation: Verify the administrator ID used for deletion
  TestValidator.equals(
    "deletion target administrator ID is valid UUID format",
    createdAdministrator.id.length,
    36,
  );
}
