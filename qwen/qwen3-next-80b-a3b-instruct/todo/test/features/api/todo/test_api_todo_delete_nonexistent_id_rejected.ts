import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_delete_nonexistent_id_rejected(
  connection: api.IConnection,
) {
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      text: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  await TestValidator.error(
    "deleted non-existent todo should return 404",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
