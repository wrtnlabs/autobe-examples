import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_other_users_item_rejected(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as first user to create a todo item
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://example.com/join",
      referrer: "http://example.com/home",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUser);

  // Step 2: Create todo item on first user account
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      text: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Authenticate as second user to attempt unauthorized update
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://example.com/join",
      referrer: "http://example.com/home",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(secondUser);

  // Step 4: Second user attempts to update first user's todo item (should fail with 404)
  await TestValidator.httpError(
    "second user cannot update other user's todo item",
    404,
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo.id,
        body: {
          text: "updated by second user",
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
