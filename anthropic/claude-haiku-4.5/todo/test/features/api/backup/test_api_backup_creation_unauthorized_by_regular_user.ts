import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppBackup } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppBackup";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates that regular (non-admin) users cannot create system backups.
 *
 * This test ensures that backup operations are properly restricted to
 * administrators only. A regular user account is created with valid
 * authentication credentials, then an attempt is made to access the backup
 * creation endpoint. The system should reject this request with a 403 Forbidden
 * error, confirming that the authorization check is working correctly.
 *
 * Test steps:
 *
 * 1. Create a regular user account with valid email and password
 * 2. Attempt to create a backup as the regular user
 * 3. Verify that the request fails with a 403 Forbidden error
 * 4. Confirm that authorization restrictions are properly enforced
 */
export async function test_api_backup_creation_unauthorized_by_regular_user(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = RandomGenerator.alphabets(12);

  const regularUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: regularUserEmail,
        password: regularUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(regularUser);
  TestValidator.predicate(
    "regular user created successfully",
    regularUser.id !== null,
  );

  // Step 2: Attempt to create a backup as the regular user
  // The connection is now authenticated as the regular user via the join operation
  // This should fail with 403 Forbidden since only admins can create backups
  await TestValidator.httpError(
    "regular user cannot create backups - should return 403 Forbidden",
    403,
    async () => {
      await api.functional.todoApp.admin.backups.create(connection);
    },
  );

  TestValidator.predicate(
    "unauthorized access properly blocked with 403 Forbidden",
    true,
  );
}
