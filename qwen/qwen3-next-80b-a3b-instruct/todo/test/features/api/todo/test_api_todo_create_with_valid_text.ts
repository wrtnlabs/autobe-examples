import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_create_with_valid_text(
  connection: api.IConnection,
) {
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

  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: "Buy groceries",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  TestValidator.equals("todo text matches", todo.text, "Buy groceries");
  TestValidator.equals("todo completed is false", todo.completed, false);
  TestValidator.predicate(
    "todo id is a valid uuid",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      todo.id,
    ),
  );
  TestValidator.predicate(
    "todo created_at is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(todo.created_at),
  );
  TestValidator.predicate(
    "todo has a valid length (1-255)",
    todo.text.length >= 1 && todo.text.length <= 255,
  );
}
