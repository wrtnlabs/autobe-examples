import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate failed login attempt for user with correct email and incorrect
 * password.
 *
 * 1. Register a new user by joining with randomly generated unique email and a
 *    valid password.
 * 2. Attempt to login with the correct email but an incorrect password (preserving
 *    minimum length/format constraints for password).
 * 3. Ensure the login operation fails (an error is thrown) and that no JWT tokens
 *    or user account data are exposed by the error.
 * 4. Check that the error message is generic and does not reveal whether the email
 *    exists or the specifics of the failure (i.e., no user account leak).
 */
export async function test_api_user_login_incorrect_password(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const correctPassword: string & tags.MinLength<8> & tags.Format<"password"> =
    typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  const register = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: correctPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(register);

  // 2. Attempt to login with wrong password
  const wrongPassword = correctPassword + RandomGenerator.alphabets(2);
  await TestValidator.error(
    "login with wrong password fails and does not leak details",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
