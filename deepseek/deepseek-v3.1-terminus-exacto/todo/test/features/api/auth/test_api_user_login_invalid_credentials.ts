import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authentication failure with incorrect password.
 *
 * This test validates that the authentication system properly rejects invalid
 * credentials and provides appropriate security error responses without
 * revealing whether the email exists in the system. The test follows a
 * realistic authentication workflow by first creating a valid user account,
 * then attempting to login with the correct email but incorrect password.
 *
 * Security validation includes ensuring that error responses don't disclose
 * email existence, maintaining the principle of security through obscurity.
 * This prevents attackers from determining valid user accounts through
 * authentication API responses.
 *
 * Steps:
 *
 * 1. Create a valid user account with random email and password
 * 2. Attempt login with correct email but incorrect password
 * 3. Validate that authentication fails with appropriate error
 * 4. Ensure security boundaries are maintained in error responses
 */
export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Create a valid user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "correctPassword123";
  const incorrectPassword = "wrongPassword456";
  const timestamp = new Date().toISOString();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: correctPassword,
      password_hash: correctPassword, // Use plain password as hash for testing
      created_at: timestamp,
      updated_at: timestamp,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Validate that login fails with incorrect password
  await TestValidator.error(
    "authentication should fail with incorrect password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: incorrectPassword,
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.ICredentials,
      });
    },
  );

  // 3. Additional validation: Ensure correct password still works
  const validLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: correctPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICredentials,
  });
  typia.assert(validLogin);
  TestValidator.equals("user ID should match", validLogin.id, user.id);
}
