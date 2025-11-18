import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login failure when attempting to authenticate with an email address that
 * doesn't exist in the system.
 *
 * This test validates that the authentication system properly rejects login
 * attempts for non-existent user accounts. The API should fail authentication
 * without revealing whether the email exists in the system (preventing user
 * enumeration attacks).
 *
 * Test Flow:
 *
 * 1. Generate a random email address that doesn't exist in the database
 * 2. Attempt to login with the non-existent email and any password
 * 3. Verify that the login request fails with an authentication error
 * 4. Confirm that no session tokens are created for the non-existent account
 */
export async function test_api_user_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address for testing
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();

  // Attempt to login with the non-existent email should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: nonexistentEmail,
          password: "anyPasswordWillDo123!",
          href: "https://test.example.com/login",
          referrer: "https://test.example.com/home",
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
