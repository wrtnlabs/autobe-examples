import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin login failure with non-existent email credentials.
 *
 * Attempts to log in as an admin with a random email (not associated with any
 * admin account) and a random password. Confirms that the login operation
 * fails: no admin tokens or session are returned and the system correctly
 * blocks authentication for missing admin accounts.
 *
 * Steps:
 *
 * 1. Generate a random email and password that does not belong to any admin.
 * 2. Attempt to log in as an admin using these credentials.
 * 3. Verify that the login API call throws an error (authentication is rejected).
 * 4. Confirm that no authorized admin session or tokens are issued.
 */
export async function test_api_admin_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Step 1: Generate a random non-existent admin email and password
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = typia.random<string & tags.Format<"password">>();

  const loginBody = {
    email: randomEmail,
    password: randomPassword,
  } satisfies IShoppingMallAdmin.ILogin;

  // Step 2: Attempt login and verify failure
  await TestValidator.error(
    "admin login with non-existent email is rejected",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: loginBody,
      });
    },
  );
}
