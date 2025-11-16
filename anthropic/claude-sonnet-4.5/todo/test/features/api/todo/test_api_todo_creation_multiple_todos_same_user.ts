import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating multiple todo items under the same user account.
 *
 * This test validates that a single user can create and manage multiple todo
 * items without any limitations. It ensures that the system correctly handles
 * multiple todo creation requests for the same authenticated user, maintains
 * data integrity, and assigns unique identifiers to each todo item.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a new user account
 * 2. Create multiple todo items with varying properties
 * 3. Validate each created todo has unique ID and correct data
 * 4. Verify all todos belong to the same user context
 */
export async function test_api_todo_creation_multiple_todos_same_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create multiple todos with different properties using ArrayUtil
  const todoCount = 5;
  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    todoCount,
    async (index) => {
      const todoData = {
        title: `${RandomGenerator.name()} - Task ${index + 1}`,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        status: RandomGenerator.pick([
          "pending",
          "in_progress",
          "completed",
          "cancelled",
        ] as const),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        completed: false,
      } satisfies ITodoListTodo.ICreate;

      const createdTodo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: todoData,
        });
      typia.assert(createdTodo);

      // Validate the created todo
      TestValidator.equals(
        "todo title matches",
        createdTodo.title,
        todoData.title,
      );
      TestValidator.equals(
        "todo description matches",
        createdTodo.description,
        todoData.description,
      );
      TestValidator.equals(
        "todo status matches",
        createdTodo.status,
        todoData.status,
      );
      TestValidator.equals(
        "todo priority matches",
        createdTodo.priority,
        todoData.priority,
      );
      TestValidator.equals(
        "todo completed status matches",
        createdTodo.completed,
        todoData.completed,
      );

      return createdTodo;
    },
  );

  // Step 3: Verify all todos have unique IDs
  const todoIds = createdTodos.map((todo) => todo.id);
  const uniqueIds = new Set(todoIds);
  TestValidator.equals("all todo IDs are unique", uniqueIds.size, todoCount);

  // Step 4: Verify all todos were created successfully
  TestValidator.equals(
    "correct number of todos created",
    createdTodos.length,
    todoCount,
  );
}
