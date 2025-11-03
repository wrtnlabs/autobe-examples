import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminBackup";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that a regular user cannot restore from backups.
 *
 * This test validates that backup restoration is exclusively restricted to
 * administrators. A regular user authenticates with valid credentials and
 * attempts to restore the system using a valid backup ID, but should receive a
 * 403 Forbidden error. This ensures that unauthorized users cannot disrupt the
 * system by restoring to previous states.
 *
 * The test verifies:
 *
 * 1. Regular user account creation and authentication
 * 2. Admin account creation to establish a valid backup
 * 3. Backup creation with admin privileges
 * 4. Unauthorized restoration attempt by regular user
 * 5. Proper 403 Forbidden error response for access denial
 * 6. System protection against unauthorized administrative operations
 */
export async function test_api_backup_restoration_unauthorized_by_regular_user(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = RandomGenerator.alphabets(10);
  const regularUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: regularUserEmail,
        password: regularUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(regularUser);
  TestValidator.equals(
    "regular user email matches registration",
    regularUser.email,
    regularUserEmail,
  );

  // Step 2: Create an admin account to establish a backup
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

  // Step 3: Create a backup using admin credentials
  const backup: ITodoAppBackup =
    await api.functional.todoApp.admin.backups.create(connection);
  typia.assert(backup);

  // Step 4: Re-authenticate as regular user to get fresh connection context
  const regularUserAuthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const regularUserSession: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(regularUserAuthConnection, {
      body: {
        email: regularUserEmail,
        password: regularUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(regularUserSession);

  // Step 5: Attempt to restore backup as regular user (should be denied with 403)
  await TestValidator.httpError(
    "regular user cannot restore backup - should receive 403 Forbidden",
    403,
    async () => {
      await api.functional.todoApp.admin.backups.restore(
        regularUserAuthConnection,
        {
          backupId: backup.id,
          body: {
            confirmation_phrase: "CONFIRM",
            reason: "Test restoration attempt by unauthorized user",
          } satisfies ITodoAppAdminBackup.IRestore,
        },
      );
    },
  );
}
