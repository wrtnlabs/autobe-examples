import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_delete_other_users_item_rejected(
  connection: api.IConnection,
) {
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user1Email,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);

  const todoItem: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoItem);

  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user2Email,
        password: "password456",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);

  await TestValidator.error(
    "cannot delete other user's todo item",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todoItem.id,
      });
    },
  );
}
