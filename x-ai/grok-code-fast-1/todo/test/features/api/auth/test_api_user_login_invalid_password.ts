import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login with correct email but an incorrect password.
 *
 * This test covers the negative authentication path for the /auth/user/login
 * endpoint:
 *
 * 1. Register a user with a valid random email, password, and display_name (to
 *    ensure login is possible).
 * 2. Attempt to login with the same email but provide a different (invalid)
 *    password.
 * 3. Expect the API to deny authentication by throwing an error (caught by
 *    TestValidator.error).
 * 4. Validate that no session or tokens are issued in this flow.
 * 5. Optionally check that error reporting logic does not leak sensitive details
 *    such as whether the email exists or not.
 */
export async function test_api_user_login_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a new user with random valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12) + "1A"; // ensure somewhat complex password
  const display_name = RandomGenerator.name();
  const href = "https://todo.example.com/auth/register";
  const referrer = "https://todo.example.com/";

  const registered = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string,
      display_name: display_name as string,
      href,
      referrer,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(registered);

  // 2. Attempt to login with correct email but invalid password
  const badPassword = password + "incorrect"; // guaranteed to differ
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: email as string,
          password: badPassword as string,
          href,
          referrer,
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
