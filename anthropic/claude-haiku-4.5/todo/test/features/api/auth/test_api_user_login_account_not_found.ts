import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_account_not_found(
  connection: api.IConnection,
) {
  /**
   * Test login failure with non-existent email address.
   *
   * This test validates that attempting to login with an email that does not
   * exist in the system results in a proper error response. The system should
   * return the AUTH_USER_NOT_FOUND error code with a generic error message that
   * does not reveal whether the email is registered, preventing email
   * enumeration attacks.
   *
   * Steps:
   *
   * 1. Generate a random non-existent email address
   * 2. Attempt to authenticate with the non-existent email
   * 3. Validate that the login attempt fails with an error
   */

  // Step 1: Generate a random email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const password = "testPassword123";

  // Step 2 & 3: Attempt to login with non-existent email and expect error
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: nonExistentEmail,
          password: password,
          href: "https://todoapp.example.com/login",
          referrer: "https://todoapp.example.com/",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
