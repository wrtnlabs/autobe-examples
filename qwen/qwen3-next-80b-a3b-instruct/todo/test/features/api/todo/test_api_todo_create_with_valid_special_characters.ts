import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_create_with_valid_special_characters(
  connection: api.IConnection,
) {
  // 1. Create a new authenticated user context
  const email: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a todo item with special characters in the text
  const todoText: string = "Call John! Remember: Meeting at 3pm.";
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: todoText,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Validate that the created todo has the expected text with special characters intact
  TestValidator.equals(
    "todo text contains special characters",
    todo.text,
    todoText,
  );
}
