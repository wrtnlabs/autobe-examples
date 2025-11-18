import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

/**
 * Test the user login process for an existing user.
 *
 * This test creates a new user account with valid credentials via the join API,
 * then authenticates this user using the login API with correct parameters. It
 * validates that the login succeeds, returning an authorized user with proper
 * UUID and JWT token.
 *
 * The test asserts all API responses for type correctness and checks for proper
 * authentication flows.
 */
export async function test_api_user_login_existing_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account via the join endpoint with random valid email and name
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const joinedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createBody,
    });
  typia.assert(joinedUser);

  // Step 2: User login with correct credentials and session metadata
  const loginBody = {
    email: createBody.email,
    password: "1234",
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies ITodoListTodoListUser.ILogin;

  const loggedInUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Validate that the logged-in user's id and token were properly returned
  TestValidator.predicate(
    "logged in user id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loggedInUser.id,
    ),
  );
  TestValidator.predicate(
    "access token is non-empty",
    loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedInUser.token.refresh.length > 0,
  );
}
