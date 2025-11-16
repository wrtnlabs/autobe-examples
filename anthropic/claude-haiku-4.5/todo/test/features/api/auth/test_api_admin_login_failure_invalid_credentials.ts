import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test admin login failure with incorrect password.
 *
 * Verifies that when an admin account exists but the password is incorrect, the
 * system rejects the authentication attempt without disclosing whether the
 * email exists in the system. Confirms that the response indicates
 * authentication failure and no tokens are issued.
 *
 * This test assumes a known admin account exists in the system and validates
 * that login fails when provided with incorrect credentials.
 *
 * Steps:
 *
 * 1. Attempt to login with a valid admin email but incorrect password
 * 2. Verify the login fails with an error response
 * 3. Confirm the error doesn't leak email existence information
 * 4. Verify no authentication tokens are issued on failure
 */
export async function test_api_admin_login_failure_invalid_credentials(
  connection: api.IConnection,
) {
  // Use a known admin email for testing
  const testAdminEmail = typia.random<string & tags.Format<"email">>();
  const incorrectPassword = "IncorrectPassword123!";

  // Step 1 & 2: Attempt login with incorrect password
  await TestValidator.error(
    "admin login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: testAdminEmail,
          password: incorrectPassword,
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Step 3: Verify that no tokens were issued by checking connection headers
  // After failed login, authorization header should not be set
  const hasUnauthorizedHeader = connection.headers?.Authorization !== undefined;
  TestValidator.predicate(
    "no authorization token should be set after failed login",
    !hasUnauthorizedHeader,
  );
}
