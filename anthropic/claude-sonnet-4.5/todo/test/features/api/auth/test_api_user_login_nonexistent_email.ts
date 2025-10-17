import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login attempt with non-existent email address.
 *
 * This test validates the security behavior of the login system when attempting
 * to authenticate with an email address that does not exist in the database.
 * The test ensures that the API returns a generic error message that does not
 * reveal whether the email exists in the system, preventing email enumeration
 * attacks.
 *
 * Test workflow:
 *
 * 1. Generate a random email address that has never been registered
 * 2. Attempt to log in with this non-existent email and any password
 * 3. Verify that the login attempt fails with HTTP 401 Unauthorized
 * 4. Confirm that the error message is generic and does not reveal email existence
 */
export async function test_api_user_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(12);

  // Attempt to login with non-existent email should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: nonExistentEmail,
          password: randomPassword,
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
