import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user login fails with invalid credentials.
 *
 * 1. Register a user with a valid random email and password via /auth/user/join
 * 2. Attempt login via /auth/user/login using the registered email but an
 *    incorrect password
 * 3. Assert that login fails with a generic error (no user info leakage)
 * 4. (Documented) Cannot check last_login not updated directly via public API, but
 *    this business logic is described here for test coverage
 */
export async function test_api_user_login_with_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Valid length (8-72)
  const joinBody = {
    email,
    password,
  } satisfies ITodoListUser.IJoin;
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(registered);

  // 2. Attempt login with incorrect password
  const invalidLoginBody = {
    email,
    password: password + "!", // Wrong password
  } satisfies ITodoListUser.ILogin;
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: invalidLoginBody,
      });
    },
  );

  // 3. (Cannot check server-side last_login update with current API)
}
