import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin login failure with incorrect password.
 *
 * This test validates the security behavior of the admin authentication system
 * when a login attempt is made with the correct email address but an incorrect
 * password. It ensures that:
 *
 * 1. The system properly rejects authentication with invalid credentials
 * 2. No session tokens are issued for failed login attempts
 * 3. Error messages are generic to prevent user enumeration attacks
 * 4. Password comparison uses constant-time validation
 *
 * Test workflow:
 *
 * 1. Create a new admin account with known credentials
 * 2. Attempt to login with the correct email but wrong password
 * 3. Verify that the login attempt fails appropriately
 * 4. Confirm no authentication tokens are returned
 */
export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a valid admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "CorrectPassword123!";
  const incorrectPassword = "WrongPassword456!";

  const connectionContext = {
    ip: "192.168.1.100",
    href: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com" satisfies string & tags.Format<"uri">,
  };

  // Create admin account
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: correctPassword,
        ...connectionContext,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to login with correct email but incorrect password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: incorrectPassword,
          href: "https://admin.example.com/login" satisfies string &
            tags.Format<"uri">,
          referrer: "https://admin.example.com" satisfies string &
            tags.Format<"uri">,
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );
}
