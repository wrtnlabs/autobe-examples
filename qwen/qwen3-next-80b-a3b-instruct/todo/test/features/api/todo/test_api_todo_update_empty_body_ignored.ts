import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_empty_body_ignored(
  connection: api.IConnection,
) {
  // Authentication: Join as new user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Create a new todo item
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph(),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);
  const originalText = todo.text;
  const originalCompleted = todo.completed;
  const originalCreatedAt = todo.created_at;
  const originalUpdatedAt = todo.updated_at;

  // Update with empty body - should be ignored
  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {} satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Verify the todo item was not modified (all fields unchanged)
  TestValidator.equals(
    "text unchanged after empty update",
    updatedTodo.text,
    originalText,
  );
  TestValidator.equals(
    "completed unchanged after empty update",
    updatedTodo.completed,
    originalCompleted,
  );
  TestValidator.equals(
    "created_at unchanged after empty update",
    updatedTodo.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "updated_at unchanged after empty update",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );
}
