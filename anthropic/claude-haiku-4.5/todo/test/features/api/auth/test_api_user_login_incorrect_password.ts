import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_login_incorrect_password(
  connection: api.IConnection,
) {
  /**
   * Test login rejection with incorrect password.
   *
   * This test verifies that the authentication system properly rejects login
   * attempts when a user provides the correct email address but an incorrect
   * password. The system must validate the password against the stored
   * password_hash and deny access with a generic error message that doesn't
   * reveal whether the email exists or the password was wrong, preventing user
   * enumeration attacks.
   *
   * Steps:
   *
   * 1. Register a new user account with a known password
   * 2. Verify the user was created successfully
   * 3. Attempt to login with correct email but wrong password
   * 4. Verify the login attempt is rejected with an error
   * 5. Confirm no authentication tokens are issued on failure
   */

  // Step 1: Register a new user with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "ValidPassword123";
  const incorrectPassword = "WrongPassword456";

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(registeredUser);
  TestValidator.equals(
    "user registered with correct email",
    registeredUser.email,
    testEmail,
  );

  // Step 2: Create an unauthenticated connection for the failed login attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt login with incorrect password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.user.login(unauthConn, {
        body: {
          email: testEmail,
          password: incorrectPassword,
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Step 4: Verify that no authorization token was set in headers on failure
  TestValidator.predicate(
    "no authorization token in connection headers after failed login",
    unauthConn.headers?.Authorization === undefined,
  );
}
