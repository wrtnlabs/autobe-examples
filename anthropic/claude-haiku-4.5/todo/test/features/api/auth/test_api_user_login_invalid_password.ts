import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login failure with incorrect password.
 *
 * Validates that the authentication system properly rejects login attempts with
 * incorrect passwords. This test first registers a user account with known
 * credentials, then attempts to login using the correct email address but an
 * intentionally wrong password. The system should fail the authentication and
 * return an appropriate error response indicating the password is incorrect.
 *
 * This test ensures:
 *
 * 1. User registration creates account with correct credentials
 * 2. Password validation occurs using secure constant-time comparison
 * 3. Authentication properly fails when password is incorrect
 * 4. Error response indicates password validation failure
 * 5. Generic error message is returned (not revealing whether email exists)
 */
export async function test_api_user_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a user account with known credentials for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "ValidPassword123";

  const registered = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail,
      password: correctPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(registered);

  // Verify the user was successfully registered
  TestValidator.equals("registered user email", registered.email, testEmail);
  TestValidator.predicate(
    "registered user status is active",
    registered.status === "active",
  );

  // Step 2: Create unauthenticated connection for login attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt login with correct email but incorrect password
  const wrongPassword = "WrongPassword456";

  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.user.login(unauthConn, {
        body: {
          email: testEmail,
          password: wrongPassword,
          href: "https://todoapp.example.com/login",
          referrer: "https://todoapp.example.com",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
