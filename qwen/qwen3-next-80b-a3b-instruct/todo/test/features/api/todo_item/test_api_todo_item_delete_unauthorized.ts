import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_item_delete_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user A to create todo item
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);

  // Step 2: Create a todo item owned by user A
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todo: ITodoListTodo =
    await api.functional.todoList.user.todoItems.create(connection, {
      body: todoTitle satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todo);

  // Step 3: Switch to user B for unauthorized deletion attempt
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: "password456",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);

  // Step 4: Attempt unauthorized deletion of todo item created by user A
  await TestValidator.error(
    "unauthorized user cannot delete another user's todo item",
    async () => {
      await api.functional.todoList.user.todoItems.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
