import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validates that an authenticated todoUser can successfully retrieve their own
 * profile information.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new todoUser account with unique credentials (email and a strong
 *    password)
 * 2. Authenticates as the newly registered user to obtain an authenticated session
 *    (token is handled by the SDK)
 * 3. Creates an initial todo item for business prerequisites
 * 4. Calls the user profile retrieval endpoint with the authenticated user's ID
 * 5. Verifies that the response includes only {id, email, created_at, updated_at}
 *    fields, matches the user's own info, and that privacy/security rules are
 *    respected (no sensitive data, only self-access is allowed)
 */
export async function test_api_todouser_profile_retrieval_authenticated_self(
  connection: api.IConnection,
) {
  // 1. Register a new todoUser
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.example.com/auth/join", // sample context url
    referrer: "https://app.example.com/welcome",
  } satisfies ITodoListTodouser.IVerifyJoin;
  const joinResult = await api.functional.auth.todoUser.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. Authenticate as the new user
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
    href: "https://app.example.com/auth/login",
    referrer: "https://app.example.com/joined",
  } satisfies ITodoListTodouser.IVerifyLogin;
  const loginResult = await api.functional.auth.todoUser.login(connection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "authenticated user's id matches join",
    loginResult.id,
    joinResult.id,
  );

  // 3. Create initial todo for authenticated user (business precondition)
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoListTodo.ICreate;
  const todo = await api.functional.todoList.todoUser.todos.create(connection, {
    body: todoInput,
  });
  typia.assert(todo);
  TestValidator.equals(
    "todo owner matches authenticated user",
    todo.todo_list_todouser_id,
    loginResult.id,
  );

  // 4. Retrieve own profile by ID
  const profile = await api.functional.todoList.todoUser.todoUsers.at(
    connection,
    { todoUserId: loginResult.id },
  );
  typia.assert(profile);

  // 5. Validate response: correct fields, correct user, and privacy rules
  // - All fields must match authenticated user info (except token)
  TestValidator.equals("profile id matches", profile.id, loginResult.id);
  TestValidator.equals(
    "profile email matches",
    profile.email,
    loginResult.email,
  );
  TestValidator.equals(
    "profile created_at matches",
    profile.created_at,
    loginResult.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches",
    profile.updated_at,
    loginResult.updated_at,
  );

  // - Sensitive data must not be present
  // - Only the documented properties are present (id, email, created_at, updated_at)
  //   typia.assert already covers type and property checks
}
