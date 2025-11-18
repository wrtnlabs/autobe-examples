import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test password change with incorrect current password validation.
 *
 * This test validates the security mechanism that prevents unauthorized
 * password changes by requiring correct current password verification. After
 * creating and authenticating an admin account, the test attempts to change the
 * password using an incorrect current_password value and verifies that the
 * operation fails with the appropriate error message.
 *
 * Steps:
 *
 * 1. Create a new admin account with known credentials
 * 2. Attempt password change with incorrect current password
 * 3. Verify the operation fails with "Current password is incorrect" error
 */
export async function test_api_admin_password_change_incorrect_current(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with known password
  const originalPassword = "SecurePass123!";
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt password change with incorrect current password
  const incorrectCurrentPassword = "WrongPassword999!";
  const newPassword = "NewSecurePass456!";

  await TestValidator.error(
    "password change with incorrect current password should fail",
    async () => {
      await api.functional.todoList.admin.admins.me.update(connection, {
        body: {
          current_password: incorrectCurrentPassword,
          new_password: newPassword,
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );
}
