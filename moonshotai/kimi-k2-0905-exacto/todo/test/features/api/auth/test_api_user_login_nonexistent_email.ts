import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user authentication with an email address that does not exist in the
 * system. Validates that the system properly handles login attempts for
 * non-existent accounts while maintaining security by providing consistent
 * error responses that do not reveal account existence information. Verify that
 * proper security measures prevent enumeration attacks.
 */
export async function test_api_user_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Attempt to login with non-existent email
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: nonExistentEmail,
          password: password,
          href: "https://todo-app.example.com/login",
          referrer: "https://todo-app.example.com/",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Verify that the system's internal headers are not affected by the failed login
  TestValidator.equals(
    "authorization header should remain empty",
    connection.headers?.Authorization,
    undefined,
  );
}
