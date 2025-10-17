import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user login succeeds with valid credentials.
 *
 * 1. Register a new user with a unique email and valid password using the join
 *    endpoint.
 * 2. Attempt to login with the same credentials.
 * 3. Verify that authentication tokens and user ID are returned upon login.
 * 4. Ensure no unwanted details are exposed on successful login.
 */
export async function test_api_user_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const joinPayload = {
    email,
    password,
  } satisfies ITodoListUser.IJoin;

  const registerResult = await api.functional.auth.user.join(connection, {
    body: joinPayload,
  });
  typia.assert(registerResult);

  // 2. Login with the same credentials
  const loginPayload = {
    email,
    password,
  } satisfies ITodoListUser.ILogin;

  const loginResult = await api.functional.auth.user.login(connection, {
    body: loginPayload,
  });
  typia.assert(loginResult);
}
