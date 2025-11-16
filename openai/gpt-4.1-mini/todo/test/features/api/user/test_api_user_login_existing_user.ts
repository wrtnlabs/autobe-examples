import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_login_existing_user(
  connection: api.IConnection,
) {
  // Step 1: Generate user registration data
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "1234";
  const name = RandomGenerator.name();

  const createBody = {
    email,
    password,
    name,
  } satisfies ITodoListTodoListUser.ICreate;

  // Step 2: Call join endpoint to create user
  const joinedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createBody,
    });
  typia.assert(joinedUser);

  // Step 3: Call login endpoint to authenticate existing user
  const loginBody = {
    email,
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/referrer",
  } satisfies ITodoListTodoListUser.ILogin;

  const loggedInUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 4: Validate that the logged in user data matches the joined user
  TestValidator.equals(
    "user id should match after login",
    loggedInUser.id,
    joinedUser.id,
  );
  TestValidator.predicate(
    "token access is present",
    typeof loggedInUser.token.access === "string" &&
      loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is present",
    typeof loggedInUser.token.refresh === "string" &&
      loggedInUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration time is a valid ISO string",
    typeof loggedInUser.token.expired_at === "string" &&
      loggedInUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable time is a valid ISO string",
    typeof loggedInUser.token.refreshable_until === "string" &&
      loggedInUser.token.refreshable_until.length > 0,
  );
}
