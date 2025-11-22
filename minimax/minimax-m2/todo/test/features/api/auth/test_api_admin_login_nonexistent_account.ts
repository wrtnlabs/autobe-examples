import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator login with non-existent account to validate proper error
 * handling for invalid authentication attempts.
 *
 * This test verifies that the system correctly rejects login attempts for
 * emails that don't exist in the administrator database, ensuring security and
 * proper error responses. The test involves creating a valid administrator
 * account first (as a prerequisite), then attempting to login with a
 * non-existent email address to confirm the system properly handles
 * authentication failures.
 *
 * Steps:
 *
 * 1. Create a valid administrator account using join API to establish
 *    authentication context
 * 2. Attempt to login with a non-existent email address to test error handling
 * 3. Validate that the login attempt fails with appropriate error response
 */
export async function test_api_admin_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Step 1: Create a valid administrator account (dependency requirement)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const validAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: typia.random<string>(),
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(validAdmin);

  // Step 2: Attempt to login with a non-existent email address
  const nonExistentEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  // Step 3: Validate that login fails for non-existent account
  await TestValidator.error(
    "login should fail for non-existent email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "randomPassword123",
          ip: "192.168.1.1",
          href: "http://localhost:3000/login",
          referrer: "http://localhost:3000/",
        } satisfies ITodoAppAdministrator.ILogin,
      });
    },
  );
}
