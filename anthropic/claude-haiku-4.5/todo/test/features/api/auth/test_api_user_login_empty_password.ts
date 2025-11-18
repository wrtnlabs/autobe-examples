import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that empty password field is rejected during login.
 *
 * This test validates the password validation requirement in the authentication
 * system. When a user attempts to login with a valid email address but provides
 * an empty password string, the API should reject the authentication request.
 * This is a critical security control that prevents access with incomplete
 * credentials.
 *
 * Steps:
 *
 * 1. Generate a valid email address for login attempt
 * 2. Attempt to login with the valid email but empty password
 * 3. Verify that the API returns an error response
 * 4. Confirm that authentication was rejected and no tokens were issued
 */
export async function test_api_user_login_empty_password(
  connection: api.IConnection,
) {
  const email = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "login with empty password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: email,
          password: "",
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
