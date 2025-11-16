import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test admin login failure with non-existent email address.
 *
 * This test validates that when an email does not correspond to any admin
 * account in the system, the login endpoint properly rejects the authentication
 * attempt. The system should return a security-conscious error response that
 * does not reveal whether the email is registered in the system (preventing
 * email enumeration attacks). The test verifies that no authentication tokens
 * are issued when login fails with a non-existent email, ensuring the security
 * boundary is maintained.
 *
 * Test steps:
 *
 * 1. Generate a random email address that does not exist in the system
 * 2. Generate a valid password string
 * 3. Attempt to login with the non-existent email and password
 * 4. Verify that the login request fails with an appropriate error
 * 5. Confirm that no authorization tokens are returned
 * 6. Ensure the error response does not leak information about email existence
 */
export async function test_api_admin_login_failure_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email that does not exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Generate a valid password for the login attempt
  const password = RandomGenerator.alphabets(12);

  // Attempt to login with non-existent email and expect failure
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: password,
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );
}
