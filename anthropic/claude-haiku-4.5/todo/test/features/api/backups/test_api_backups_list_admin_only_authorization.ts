import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that backups list is properly protected with admin-only authorization.
 *
 * Validates that unauthenticated users receive 401 Unauthorized, regular
 * authenticated users receive 403 Forbidden, and only admin-authenticated users
 * can successfully retrieve the backups list. Ensures strict authorization
 * enforcement to protect sensitive backup management operations from
 * unauthorized access.
 *
 * Authorization Test Flow:
 *
 * 1. Attempt unauthenticated access and verify 401 Unauthorized response
 * 2. Create regular user account and verify 403 Forbidden response
 * 3. Create admin account and verify successful 200 response with backup data
 */
export async function test_api_backups_list_admin_only_authorization(
  connection: api.IConnection,
) {
  // Step 1: Test unauthenticated access - should return 401 Unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated users should receive 401 Unauthorized",
    401,
    async () => {
      await api.functional.todoApp.admin.backups.index(unauthConn);
    },
  );

  // Step 2: Create regular user and test non-admin access - should return 403 Forbidden
  const regularUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const regularUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: regularUserEmail,
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(regularUser);

  // Create a connection with regular user's auth token
  const regularUserConn: api.IConnection = {
    ...connection,
    headers: { Authorization: regularUser.token.access },
  };

  await TestValidator.httpError(
    "regular users should receive 403 Forbidden",
    403,
    async () => {
      await api.functional.todoApp.admin.backups.index(regularUserConn);
    },
  );

  // Step 3: Create admin account and test admin access - should succeed with 200
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(12);
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

  // Create a connection with admin's auth token
  const adminConn: api.IConnection = {
    ...connection,
    headers: { Authorization: admin.token.access },
  };

  // Admin should be able to access the backups list successfully
  const backups: ITodoAppBackup.ISummary =
    await api.functional.todoApp.admin.backups.index(adminConn);
  typia.assert(backups);
}
