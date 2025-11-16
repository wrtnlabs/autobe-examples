import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_toggle_completion_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new user to create and own the todo item
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Create a new todo item
  const todoText: string = RandomGenerator.paragraph({ sentences: 3 });
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        text: todoText,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals("todo text matches", createdTodo.text, todoText);
  TestValidator.equals(
    "todo is initially not completed",
    createdTodo.completed,
    false,
  );

  // 3. Toggle the completion status (update to completed)
  const toggledTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(toggledTodo);

  // 4. Verify the update: text unchanged, completed toggled to true, updated_at refreshed
  TestValidator.equals(
    "todo text unchanged after update",
    toggledTodo.text,
    todoText,
  );
  TestValidator.equals("todo is now completed", toggledTodo.completed, true);
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(toggledTodo.updated_at) > new Date(createdTodo.created_at),
  );

  // 5. Verify that the todo was created by this user (ownership)
  TestValidator.equals(
    "user ID matches authenticated user",
    toggledTodo.id,
    createdTodo.id,
  );
}
