import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login with correct user credentials and validate authentication/session
 * response integrity.
 *
 * 1. Register a new user, recording the generated email and password.
 * 2. Authenticate (login) with those credentials.
 * 3. Confirm login succeeds and returns a valid authenticated user DTO
 *    (IAuthorized).
 * 4. Validate the user identity of the returned DTO matches the registered user.
 * 5. Validate tokens with typia.assert; all type and format validations are
 *    covered by typia.assert.
 * 6. Ensure user is not disabled (disabled_at === null).
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // 1. Register a new user
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: joinEmail,
    password: joinPassword,
    href: "https://todo-list-app-example.com/join",
    referrer: "https://todo-list-app-example.com/landing",
  } satisfies ITodoListUser.IJoin;
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(registered);

  // 2. Login with the same credentials
  const loginBody = {
    email: joinEmail,
    password: joinPassword,
  } satisfies ITodoListUser.ILogin;
  const loggedIn: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Validate returned user identity matches registration
  TestValidator.equals(
    "user id should match registration",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals(
    "user email should match registration",
    loggedIn.email,
    registered.email,
  );

  // 4. Validate token structure - already done by typia.assert; no further property checks needed

  // 5. Ensure user is not disabled
  TestValidator.equals("should not be disabled", loggedIn.disabled_at, null);
}
