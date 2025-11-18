import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate unauthorized access for todo detail endpoint.
 *
 * This test verifies that the /todoList/user/todos/{todoId} endpoint denies
 * unauthenticated requests. The flow is:
 *
 * 1. Register a user for testing
 * 2. As the user, create a todo (obtain a valid todoId)
 * 3. Attempt to GET /todoList/user/todos/{todoId} without authenticating (on a
 *    connection with empty headers)
 * 4. Expect access to be refused with an authentication error.
 */
export async function test_api_todo_detail_denied_to_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Register new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphabets(10);
  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/signup",
      referrer: "https://example.com/home",
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(joinResult);

  // 2. Create todo as logged-in user
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
  } satisfies ITodoListTodo.ICreate;
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoInput,
    },
  );
  typia.assert(createdTodo);

  // 3. Create unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to fetch todo details without authentication and expect error
  await TestValidator.error(
    "GET /todoList/user/todos/{todoId} must be denied if not authenticated",
    async () => {
      await api.functional.todoList.user.todos.at(unauthConn, {
        todoId: createdTodo.id,
      });
    },
  );
}
