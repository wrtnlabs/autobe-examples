import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that user login fails with incorrect password.
 *
 * This test ensures that the API correctly rejects login attempts with a wrong
 * password. The workflow involves:
 *
 * 1. Registering a new user (using /auth/user/join, simulating verified user).
 * 2. Attempting to login with the correct email but an incorrect password.
 * 3. Asserting that authentication fails (TestValidator.error) and no
 *    token/session is issued.
 *
 * Steps:
 *
 * - Generate a random email and password for registration.
 * - Register the user and verify successful registration.
 * - Attempt to login with same email and an intentionally wrong password.
 * - Assert that the API returns a business error and does not issue an
 *   authentication token.
 */
export async function test_api_todo_list_user_login_fail_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register a new user (simulate verified)
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<string & tags.Format<"password">>();
  const joinBody = {
    email,
    password: correctPassword,
    href: "https://app.autobe.com/register",
    referrer: "https://app.autobe.com/",
    display_name: RandomGenerator.name(),
  } satisfies ITodoListUser.ICreate;
  const joinOutput = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(joinOutput);
  // (Simulate verified user. If needed for real SUT, insert verification step here.)

  // 2. Attempt login with correct email, wrong password
  const wrongPassword = correctPassword + "1";
  const loginBody = {
    email,
    password: wrongPassword,
    href: "https://app.autobe.com/login",
    referrer: "https://app.autobe.com/",
  } satisfies ITodoListUser.ILogin;
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginBody });
    },
  );
}
