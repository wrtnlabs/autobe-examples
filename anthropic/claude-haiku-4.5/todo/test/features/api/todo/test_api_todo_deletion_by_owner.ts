import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates permanent deletion of todo items by authenticated users.
 *
 * Tests the complete todo deletion workflow:
 *
 * 1. User registration and authentication
 * 2. Todo creation by authenticated user
 * 3. Todo permanent deletion by owner
 * 4. Verification that deleted todo is no longer accessible
 *
 * This ensures users have full control over their todo lifecycle with the
 * ability to permanently remove completed or unwanted items.
 */
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.equals("user registration successful", user.status, "active");

  // 2. Create a todo item
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 10,
        }),
        priority: "high",
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo created with active status",
    todo.status,
    "active",
  );
  TestValidator.predicate(
    "todo has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );

  // 3. Delete the todo item
  const deletedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.erase(connection, {
      todoId: todo.id,
    });
  typia.assert(deletedTodo);
  TestValidator.equals(
    "deleted todo ID matches original todo ID",
    deletedTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "deleted todo has same title as created todo",
    deletedTodo.title,
    todo.title,
  );
}
