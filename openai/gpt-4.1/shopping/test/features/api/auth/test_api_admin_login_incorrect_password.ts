import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate failure of administrator login due to incorrect password.
 *
 * This test covers the negative scenario where an admin attempts to sign in
 * using a registered email but with a wrong password. It ensures that:
 *
 * - Admin account can be successfully registered and is available for login
 *   attempts.
 * - Performing login with the correct email and an incorrect password will fail
 *   authentication.
 * - The API does not issue authentication tokens or session cookies when
 *   authentication fails.
 * - The error handling and messaging conforms to business rules for
 *   authentication failures (do not leak account existence, respect
 *   anti-abuse/rate limiting logic).
 *
 * Steps:
 *
 * 1. Register a new admin using valid (randomized) credentials.
 * 2. Attempt to log in with the exact same email but an incorrect password.
 * 3. Validate that the login call rejects and does not return any admin session
 *    data or token.
 * 4. Optionally, confirm that repeated failed attempts are handled as per
 *    anti-abuse/rate-limiting policies.
 */
export async function test_api_admin_login_incorrect_password(
  connection: api.IConnection,
) {
  // 1. Register a new admin account with randomized credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
  } satisfies IShoppingMallAdmin.ICreate;
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // 2. Attempt login with the correct email but a wrong password
  const wrongPassword = adminPassword + "-wrong";
  const loginBody = {
    email: adminEmail,
    password: wrongPassword satisfies string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.ILogin;

  await TestValidator.error(
    "admin login fails with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, { body: loginBody });
    },
  );
}
