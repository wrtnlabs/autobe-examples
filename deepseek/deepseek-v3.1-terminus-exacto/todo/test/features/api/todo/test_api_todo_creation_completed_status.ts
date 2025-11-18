import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creation of a todo item with 'completed' status.
 *
 * Validates that users can create todos in completed state for retrospective
 * task tracking or pre-accomplished items, ensuring proper status assignment
 * and workflow support.
 */
export async function test_api_todo_creation_completed_status(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail satisfies string & tags.Format<"email">,
      password: "SecurePassword123!",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create todo with explicit 'completed' status
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "completed" as const,
  } satisfies ITodoListTodo.ICreate;

  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: todoData,
  });
  typia.assert(todo);

  // Step 3: Validate todo creation with completed status
  TestValidator.equals("todo title matches input", todo.title, todoData.title);
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    todoData.description,
  );
  TestValidator.equals("todo status is completed", todo.status, "completed");
  TestValidator.predicate(
    "todo has valid title length",
    todo.title.length >= 1 && todo.title.length <= 255,
  );
  TestValidator.predicate(
    "todo has valid description length",
    todo.description !== undefined && todo.description.length <= 1000,
  );
}
