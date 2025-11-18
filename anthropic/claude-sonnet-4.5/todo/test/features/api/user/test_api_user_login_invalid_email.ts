import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login failure when attempting to authenticate with an email address that
 * does not exist in the system.
 *
 * This scenario verifies proper handling of non-existent user accounts during
 * authentication. The system should reject the login attempt without revealing
 * whether the email exists or not, following security best practices to prevent
 * user enumeration attacks.
 *
 * Steps:
 *
 * 1. Generate a random email address that has never been registered
 * 2. Prepare valid session context (href, referrer) for the login request
 * 3. Attempt to login with the non-existent email and any password
 * 4. Verify that the authentication fails with an error
 */
export async function test_api_user_login_invalid_email(
  connection: api.IConnection,
) {
  // Generate a random email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Prepare login request with non-existent email
  const loginRequest = {
    email: nonExistentEmail,
    password: "anyPassword123",
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies ITodoListUser.ILogin;

  // Verify that login fails for non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginRequest,
      });
    },
  );
}
