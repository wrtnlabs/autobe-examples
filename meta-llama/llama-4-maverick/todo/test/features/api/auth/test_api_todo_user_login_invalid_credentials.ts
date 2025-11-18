import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test invalid login credentials for todo user authentication.
 *
 * 1. Register a new todo user with valid credentials using random email and
 *    password.
 * 2. Attempt to login using the correct email but an incorrect password.
 * 3. Assert that the login attempt fails by raising an error, and no
 *    authentication token is issued.
 */
export async function test_api_todo_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Register a new todo user with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password: password as string & tags.MinLength<8> & tags.MaxLength<128>,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
    ip: undefined,
  } satisfies ITodoUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // Step 2: Attempt to login with correct email and incorrect password
  const invalidLoginBody = {
    email: email,
    password: password + "_wrong", // ensure the password is not the same
    href: "https://example.com/login",
    referrer: "https://example.com/landing",
    ip: undefined,
  } satisfies ITodoUser.ILogin;

  await TestValidator.error(
    "login with invalid credentials should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: invalidLoginBody,
      });
    },
  );
}
