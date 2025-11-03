import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_item_deletion_by_id(
  connection: api.IConnection,
) {
  // 1. Authenticate the first user by joining
  const user1: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
        password: "secret123",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user1);

  // 2. Create a todo item for user1
  const todoItemCreateBody = {
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "pending",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
  } satisfies ITodoItem.ICreate;

  const todoItem: ITodoItem = await api.functional.todo.user.todoItems.create(
    connection,
    {
      body: todoItemCreateBody,
    },
  );
  typia.assert(todoItem);

  // 3. Permanently delete the created todo item
  await api.functional.todo.user.todoItems.erase(connection, {
    todoItemId: todoItem.id,
  });

  // 4. Authenticate a different user (user2)
  const user2: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(5)}@example.org`,
        password: "secret456",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user2);

  // 5. Attempt deletion of the same todo item by user2, which should fail authorization
  await TestValidator.error(
    "unauthorized user cannot delete todo item",
    async () => {
      await api.functional.todo.user.todoItems.erase(connection, {
        todoItemId: todoItem.id,
      });
    },
  );
}
