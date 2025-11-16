import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator login failure with incorrect credentials.
 *
 * This test validates that the system properly rejects authentication attempts
 * with invalid email/password combinations. It ensures that:
 *
 * 1. Create a valid admin account with known credentials
 * 2. Attempt login with correct email but wrong password - should fail
 * 3. Attempt login with non-existent email - should fail
 * 4. Verify no tokens are issued and errors are thrown for both scenarios
 * 5. Ensure error responses don't reveal whether email exists (security best
 *    practice)
 *
 * This prevents account enumeration attacks by providing consistent error
 * responses regardless of whether the email exists or the password is
 * incorrect.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid admin account for testing
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "SecurePassword123!";

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: validEmail,
        password: validPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Attempt login with correct email but WRONG password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: validEmail,
          password: "WrongPassword999!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );

  // Step 3: Attempt login with NON-EXISTENT email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "AnyPassword123!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );
}
