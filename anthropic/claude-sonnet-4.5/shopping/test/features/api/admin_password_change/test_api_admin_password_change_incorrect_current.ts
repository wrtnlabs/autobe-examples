import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test that the password change operation rejects requests when an incorrect
 * current password is provided.
 *
 * This test validates the security mechanism that prevents unauthorized
 * password changes by verifying the current password before allowing
 * modifications. Even with a valid authenticated session, an attacker who
 * doesn't know the actual password cannot change it.
 *
 * Test workflow:
 *
 * 1. Create a new admin account with a known password
 * 2. Authenticate as that admin (automatic via join)
 * 3. Attempt to change the password with an incorrect current password
 * 4. Verify the operation fails with appropriate error
 */
export async function test_api_admin_password_change_incorrect_current(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with known credentials
  const correctPassword = "ValidPass123!";
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const adminData = {
    email: adminEmail,
    password: correctPassword,
    name: RandomGenerator.name(),
    role_level: "order_manager",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Verify admin was created successfully and is authenticated
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.predicate(
    "admin has valid token",
    admin.token.access.length > 0,
  );

  // Step 3: Attempt to change password with INCORRECT current password
  const incorrectCurrentPassword = "WrongPassword999!";
  const newPassword = "NewSecurePass456!";

  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.auth.admin.password.change.changePassword(
        connection,
        {
          body: {
            current_password: incorrectCurrentPassword,
            new_password: newPassword,
          } satisfies IShoppingMallAdmin.IPasswordChange,
        },
      );
    },
  );
}
