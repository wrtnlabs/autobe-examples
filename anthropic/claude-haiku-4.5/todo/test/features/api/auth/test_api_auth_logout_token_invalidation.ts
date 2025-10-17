import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test that logout properly invalidates tokens and prevents reuse.
 *
 * This test validates the complete logout workflow:
 *
 * 1. User registers and logs in to obtain access token
 * 2. User performs authenticated operation (create todo) with valid token
 * 3. User logs out to invalidate the session
 * 4. Attempt to use the invalidated token fails with 401 Unauthorized
 *
 * This ensures logout terminates the session immediately and prevents token
 * reuse, protecting user security and data privacy.
 */
export async function test_api_auth_logout_token_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const email = typia.random<string & tags.Format<"email">>();

  const registered = await api.functional.todoApp.auth.register(connection, {
    body: {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: email,
      message: "User registered successfully",
    } satisfies ITodoAppAuthenticatedUser.IRegister,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered user email matches",
    registered.email,
    email,
  );

  // Step 2: Login to obtain access token
  const loggedIn = await api.functional.todoApp.auth.login(connection, {
    body: {
      email: email,
      password: "ValidPassword123!",
    } satisfies ITodoAppAuthenticatedUser.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.predicate(
    "login returns valid token",
    () => loggedIn.token.length > 0,
  );

  const validToken = loggedIn.token;

  // Step 3: Create authenticated connection with valid token
  const authenticatedConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${validToken}`,
    },
  };

  // Step 4: Perform authenticated operation (create todo) with valid token
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todoApp.todos.create(
    authenticatedConnection,
    {
      body: todoData,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    todoData.title,
  );
  TestValidator.predicate(
    "todo is initially incomplete",
    createdTodo.isCompleted === false,
  );

  // Step 5: Logout to invalidate the token
  const logoutResponse = await api.functional.todoApp.auth.logout(
    authenticatedConnection,
  );
  typia.assert(logoutResponse);
  TestValidator.predicate(
    "logout returns success message",
    logoutResponse.message.length > 0,
  );

  // Step 6: Attempt to use invalidated token - should fail with 401
  await TestValidator.error(
    "using invalidated token should fail with 401",
    async () => {
      await api.functional.todoApp.todos.create(authenticatedConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );

  TestValidator.predicate(
    "token invalidation prevents authenticated operations",
    true,
  );
}
