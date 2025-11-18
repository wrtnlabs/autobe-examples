import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todo retrieval without authentication is rejected.
 *
 * Validates that the GET /todoList/user/todos/{todoId} endpoint enforces
 * authentication requirements and properly rejects unauthenticated access
 * attempts.
 *
 * Test workflow:
 *
 * 1. Register a new user account via POST /auth/user/join
 * 2. Create a todo item via POST /todoList/user/todos
 * 3. Create an unauthenticated connection with empty headers
 * 4. Attempt to retrieve the todo without authentication token
 * 5. Verify the request fails with 401 Unauthorized error
 * 6. Confirm system enforces authentication for todo retrieval
 */
export async function test_api_todo_retrieval_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account to establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authenticatedUser);

  // Step 2: Create a todo item for this user with authentication
  const todoItem = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoItem);

  // Step 3: Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4 & 5: Attempt to retrieve the todo without authentication
  // Verify that the request fails with proper authorization error
  await TestValidator.error(
    "unauthorized access should be rejected when retrieving todo without authentication",
    async () => {
      await api.functional.todoList.user.todos.at(unauthenticatedConnection, {
        todoId: todoItem.id,
      });
    },
  );
}
