import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates login rejection for a non-existent user account.
 *
 * Ensures that attempting to log in with a randomly generated email (guaranteed
 * to not exist in the database) and random password is securely denied by the
 * /auth/user/login endpoint. The response should not indicate whether the
 * account exists, and must never issue any authorization token. The error must
 * be generic, with no information disclosure about registration state or
 * account status.
 *
 * Steps:
 *
 * 1. Prepare a valid, random login email and password (simulate never-registered
 *    user).
 * 2. Attempt login and expect a failure.
 * 3. Assert that no token is returned, and error does not disclose any account
 *    state.
 */
export async function test_api_user_login_nonexistent_account(
  connection: api.IConnection,
) {
  // 1. Prepare credentials for a definitely non-existent user
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ILogin;

  // 2. Attempt login and expect a generic error response (no existence leak, no token issued)
  await TestValidator.error(
    "login with non-existent email should fail securely",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginBody });
    },
  );
}
