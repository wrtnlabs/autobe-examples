import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_text_and_status_together(
  connection: api.IConnection,
) {
  // Authenticate as a new user
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: "testuser@example.com",
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Create a new todo item
  const createResponse: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        text: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createResponse);

  // Update the todo item's text and completion status together
  const updateResponse: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createResponse.id,
      body: {
        text: "Updated todo text",
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updateResponse);

  // Validate that both text and completed fields were updated correctly
  TestValidator.equals(
    "updated text matches",
    updateResponse.text,
    "Updated todo text",
  );
  TestValidator.equals(
    "completed status toggled to true",
    updateResponse.completed,
    true,
  );

  // Validate that updated_at timestamp was refreshed by ensuring it's different from created_at
  TestValidator.notEquals(
    "updated_at is different from created_at",
    updateResponse.updated_at,
    createResponse.created_at,
  );
}
