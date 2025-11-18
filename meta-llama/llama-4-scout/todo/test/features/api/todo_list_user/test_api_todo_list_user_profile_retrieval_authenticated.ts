import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate authenticated user's profile retrieval after registration and login.
 *
 * This test verifies that a user can retrieve their own profile via
 * `/todoList/user/users/me` after registration (and assumed backend-developed
 * email verification flow done implicitly or not required). No manual DTO
 * patching. All state changes are through API calls. Also, attempting profile
 * retrieval without authentication should fail.
 *
 * Steps:
 *
 * 1. Register a new todo list user (random email and password, valid display
 *    name).
 * 2. Login with registered credentials.
 * 3. Request `/todoList/user/users/me` with authentication (must succeed and
 *    contain all required fields).
 * 4. Attempt `/todoList/user/users/me` with an unauthenticated connection (must
 *    fail with error).
 */
export async function test_api_todo_list_user_profile_retrieval_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name();
  const joinBody = {
    email,
    password,
    display_name: displayName,
    href: "https://e2e-test.todo-list/join",
    referrer: "https://e2e-test.todo-list/start",
  } satisfies ITodoListUser.IJoin;
  const joined = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // 2. Login as the user
  const loginBody = {
    email,
    password,
    href: "https://e2e-test.todo-list/login",
    referrer: "https://e2e-test.todo-list/join-complete",
  } satisfies ITodoListUser.ILogin;
  const loginResult = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 3. Retrieve "me" profile (authenticated)
  const me = await api.functional.todoList.user.users.me.at(connection);
  typia.assert(me);
  TestValidator.equals("me.email matches registration", me.email, email);
  TestValidator.equals(
    "me.display_name matches registration",
    me.display_name,
    displayName,
  );
  TestValidator.equals(
    "me.is_active must be true after registration",
    me.is_active,
    true,
  );
  TestValidator.predicate(
    "me.created_at is ISO date",
    typeof me.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(me.created_at),
  );
  TestValidator.predicate(
    "me.updated_at is ISO date",
    typeof me.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(me.updated_at),
  );

  // 4. Logout (simulate unauthenticated connection by clearing Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should fail to retrieve profile without authentication",
    async () => {
      await api.functional.todoList.user.users.me.at(unauthConn);
    },
  );
}
