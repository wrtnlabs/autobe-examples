import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test the user login process for an existing user.
 *
 * This function creates a new user account, then performs login with the
 * created user credentials. It validates the successful login flow, including
 * assertion of issued JWT tokens and returned user information.
 *
 * Steps:
 *
 * 1. Create user with random but valid email and password using the join endpoint.
 * 2. Log in using the same email and password.
 * 3. Assert that the login response includes valid JWT tokens and matching user
 *    ID.
 */
export async function test_api_user_login_existing_user(
  connection: api.IConnection,
) {
  // 1. Create a new user account
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const createdUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITodoUser.ICreate,
    });
  typia.assert(createdUser);

  // 2. Log in with the created user
  const loginUser: ITodoUser.IAuthorized = await api.functional.auth.user.login(
    connection,
    {
      body: {
        email: email,
        password: password,
        ip: null,
        href: "http://localhost/login",
        referrer: "http://localhost/",
      } satisfies ITodoUser.ILogin,
    },
  );
  typia.assert(loginUser);

  // 3. Validate the login response
  TestValidator.predicate("login returned user id", loginUser.id.length > 0);
  TestValidator.equals(
    "login user id matches created user id",
    loginUser.id,
    createdUser.id,
  );

  TestValidator.predicate(
    "login returned token access",
    typeof loginUser.token.access === "string" &&
      loginUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returned token refresh",
    typeof loginUser.token.refresh === "string" &&
      loginUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token expired_at is valid ISO date",
    !isNaN(Date.parse(loginUser.token.expired_at)),
  );
  TestValidator.predicate(
    "login token refreshable_until is valid ISO date",
    !isNaN(Date.parse(loginUser.token.refreshable_until)),
  );
}
