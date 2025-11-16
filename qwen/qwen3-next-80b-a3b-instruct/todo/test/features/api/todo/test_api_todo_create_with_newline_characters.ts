import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_create_with_newline_characters(
  connection: api.IConnection,
) {
  // First, create an authenticated user context
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Extract the authorization token from the response to ensure authenticated context
  // The SDK automatically handles the authorization header for subsequent calls

  // Create a todo item with newline characters in the text
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: "Complete report\nReview feedback\nSubmit by Friday",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Validate that the todo item was created with the exact text containing newline characters
  TestValidator.equals(
    "",
    todo.text,
    "Complete report\nReview feedback\nSubmit by Friday",
  );
}
