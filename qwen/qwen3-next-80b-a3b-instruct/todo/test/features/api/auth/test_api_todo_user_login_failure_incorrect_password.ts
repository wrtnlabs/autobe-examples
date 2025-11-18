import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Tests rejection of incorrect password during login (credential security).
 *
 * 1. Register user with unique random email and known password.
 * 2. Attempt login using same email but wrong password.
 * 3. Expect authentication error (business error, not technical leak).
 * 4. Confirm no token or sensitive data issued on failure.
 */
export async function test_api_todo_user_login_failure_incorrect_password(
  connection: api.IConnection,
) {
  // 1. Register a user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://app.todo-list.com/register",
    referrer: "https://app.todo-list.com/landing",
    // optional ip can be null/undefined (simulate client context)
    ip: null,
  } satisfies ITodoUser.IJoin;
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);
  TestValidator.equals(
    "registered email is as given",
    authorizedUser.email,
    email,
  );

  // 2. Try logging in with the same email but wrong password
  const loginBody = {
    email,
    password: RandomGenerator.alphaNumeric(16), // wrong password
    href: "https://app.todo-list.com/login",
    referrer: "https://app.todo-list.com/register",
    ip: null,
  } satisfies ITodoUser.ILogin;

  await TestValidator.error(
    "login with incorrect password fails and issues no token",
    async () => {
      // Should throw business error (no technical/user existence leak)
      await api.functional.auth.user.login(connection, {
        body: loginBody,
      });
    },
  );
}
