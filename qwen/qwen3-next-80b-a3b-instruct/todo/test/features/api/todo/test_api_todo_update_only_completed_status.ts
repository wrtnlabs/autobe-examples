import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_only_completed_status(
  connection: api.IConnection,
) {
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://google.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  TestValidator.equals(
    "text should remain unchanged",
    todo.text,
    updatedTodo.text,
  );
  TestValidator.equals(
    "completed status should be updated to true",
    updatedTodo.completed,
    true,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedTodo.updated_at) > new Date(todo.created_at),
  );
}
