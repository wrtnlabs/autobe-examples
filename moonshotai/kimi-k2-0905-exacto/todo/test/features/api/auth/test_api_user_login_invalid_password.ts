import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login failure with incorrect password for existing user account.
 *
 * Validates password authentication rejects invalid credentials while
 * maintaining account security and preventing unauthorized access attempts.
 * This test ensures the system properly validates user credentials and prevents
 * brute force attacks through proper error handling when incorrect passwords
 * are provided.
 *
 * 1. Create a new user account with valid email and password
 * 2. Attempt login with the same email but incorrect password
 * 3. Verify that login fails with appropriate error response
 * 4. Confirm account remains secure during failed authentication attempts
 */
export async function test_api_user_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: "https://todoapp.com/join",
      referrer: "https://todoapp.com/",
    } satisfies ITodoAppUser.IJoin,
  });

  typia.assert(createdUser);

  // Step 2: Attempt login with incorrect password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email,
          password: "WrongPassword123",
          href: "https://todoapp.com/login",
          referrer: "https://todoapp.com/join",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Step 3: Attempt login with completely wrong password format
  await TestValidator.error(
    "login should fail with wrong format password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email,
          password: "short",
          href: "https://todoapp.com/login",
          referrer: "https://todoapp.com/join",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
