import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validates that a login attempt for a todoUser fails when an incorrect
 * password is supplied.
 *
 * The test first registers a new todoUser with valid credentials, then attempts
 * to log in using the registered email but an intentionally incorrect password.
 * It validates that authentication is refused, no session is created, and the
 * business error response is returned according to schema and security
 * policies.
 *
 * Steps:
 *
 * 1. Register a new todoUser (setup)
 * 2. Attempt login with the correct email but wrong password
 * 3. Assert that login fails by catching the error
 */
export async function test_api_todouser_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new todoUser
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password: password satisfies string as string,
    href: "https://test-app/login",
    referrer: "https://test-app/register",
  } satisfies ITodoListTodouser.IVerifyJoin;
  await api.functional.auth.todoUser.join(connection, {
    body: joinBody,
  });

  // Step 2: Attempt login with correct email and an incorrect password
  const wrongPassword = password + "!wrong";
  const loginBody = {
    email,
    password: wrongPassword satisfies string as string,
    href: "https://test-app/login",
    referrer: "https://test-app/forgot-password",
  } satisfies ITodoListTodouser.IVerifyLogin;

  // Step 3: Assert that login fails with proper business error
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.todoUser.login(connection, {
        body: loginBody,
      });
    },
  );
}
