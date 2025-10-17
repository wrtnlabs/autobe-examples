import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test password reuse prevention policy for admin accounts.
 *
 * This test validates that the system enforces password history tracking and
 * prevents admins from reusing any of their last 5 passwords. The test creates
 * an admin account, changes the password multiple times to build up history,
 * then attempts to reuse a previous password and verifies the operation fails
 * appropriately.
 *
 * Steps:
 *
 * 1. Create a new admin account with initial password
 * 2. Change password 5 times to fill the password history
 * 3. Attempt to change password back to a password in the history
 * 4. Verify the reuse attempt is rejected with appropriate error
 */
export async function test_api_admin_password_change_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with initial password
  const initialPassword = "InitialPass123!";
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: initialPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Track all passwords used during the test
  const passwordHistory = [initialPassword];

  // Step 2: Change password 5 times to build password history
  // After these changes, the system will have stored the last 5 password hashes
  for (let i = 1; i <= 5; i++) {
    const currentPassword = passwordHistory[passwordHistory.length - 1];
    const newPassword = `NewPassword${i}23!`;

    const changeResponse =
      await api.functional.auth.admin.password.change.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: newPassword,
          } satisfies IShoppingMallAdmin.IPasswordChange,
        },
      );
    typia.assert(changeResponse);

    passwordHistory.push(newPassword);
  }

  // Password history now contains 6 passwords:
  // [0] InitialPass123! (oldest, should be outside last 5)
  // [1] NewPassword123! (should be in last 5)
  // [2] NewPassword223! (should be in last 5)
  // [3] NewPassword323! (should be in last 5)
  // [4] NewPassword423! (should be in last 5)
  // [5] NewPassword523! (current password, in last 5)

  // Step 3 & 4: Attempt to reuse a password from the last 5 and verify failure
  const currentPassword = passwordHistory[passwordHistory.length - 1];
  const passwordToReuse = passwordHistory[1]; // NewPassword123! - definitively in last 5

  await TestValidator.error(
    "password reuse from last 5 passwords should fail",
    async () => {
      await api.functional.auth.admin.password.change.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: passwordToReuse,
          } satisfies IShoppingMallAdmin.IPasswordChange,
        },
      );
    },
  );
}
