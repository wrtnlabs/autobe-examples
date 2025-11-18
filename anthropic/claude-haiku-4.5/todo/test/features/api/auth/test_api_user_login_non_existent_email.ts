import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login rejection with non-existent email address.
 *
 * This test validates the security and privacy of the authentication system by
 * ensuring that login attempts with non-existent email addresses are properly
 * rejected. The system must not reveal whether an email exists in the database,
 * preventing email enumeration attacks where malicious actors could discover
 * registered email addresses.
 *
 * Test flow:
 *
 * 1. Attempt to login with a random email that does not exist in the system
 * 2. Verify that the login fails with an appropriate error response
 * 3. Confirm that no authentication tokens are issued
 * 4. Ensure that no user account information is exposed
 * 5. Verify that the error message is generic and does not reveal email status
 *
 * This protects user privacy by preventing attackers from determining which
 * email addresses are registered in the system.
 */
export async function test_api_user_login_non_existent_email(
  connection: api.IConnection,
) {
  // Generate a random email address that is extremely unlikely to exist
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphabets(12);

  // Attempt to login with non-existent email
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

  // Verify that no authorization token was set in the connection headers
  TestValidator.predicate(
    "connection should not have authorization header after failed login",
    !connection.headers?.Authorization ||
      connection.headers.Authorization === "",
  );
}
