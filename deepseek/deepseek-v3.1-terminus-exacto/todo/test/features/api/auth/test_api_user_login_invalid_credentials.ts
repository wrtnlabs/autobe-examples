import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user authentication with invalid credentials.
 *
 * This test validates that the authentication system properly rejects invalid
 * login attempts while maintaining security best practices. It tests both wrong
 * password scenarios and non-existent user accounts to ensure comprehensive
 * error handling.
 */
export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "validPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test login with wrong password
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: "wrongPassword456",
          href: "https://example.com/login",
          referrer: "https://example.com/",
          // ip field is optional, so we can omit it
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Step 3: Test login with non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      const nonExistentEmail = typia.random<string & tags.Format<"email">>();
      await api.functional.auth.user.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "anyPassword789",
          href: "https://example.com/login",
          referrer: "https://example.com/",
          // ip field is optional, so we can omit it
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
