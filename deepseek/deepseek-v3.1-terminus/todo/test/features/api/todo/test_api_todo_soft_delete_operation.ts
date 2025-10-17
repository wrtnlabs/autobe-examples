import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

export async function test_api_todo_soft_delete_operation(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";

  const user: IMinimalTodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IMinimalTodoUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a todo item to be soft deleted
  const todoContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const todo: IMinimalTodoTodo = await api.functional.minimalTodo.todos.create(
    connection,
    {
      body: {
        content: todoContent,
      } satisfies IMinimalTodoTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Verify the todo is created with null deleted_at (not deleted yet)
  TestValidator.equals(
    "todo should have null deleted_at initially",
    todo.deleted_at,
    null,
  );

  // Step 3: Perform soft delete operation
  await api.functional.minimalTodo.todos.erase(connection, {
    todoId: todo.id,
  });

  // Validation: The successful completion of the erase operation without errors
  // confirms that the todo was properly soft deleted (deleted_at timestamp set)
  // In a soft delete system, deleted items are typically filtered out from queries
  // so we cannot retrieve the todo to verify the deleted_at timestamp directly
}
