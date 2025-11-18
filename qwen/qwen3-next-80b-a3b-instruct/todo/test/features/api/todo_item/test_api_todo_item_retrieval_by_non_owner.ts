import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_item_retrieval_by_non_owner(
  connection: api.IConnection,
) {
  // 1. Authenticate as user A to create a todo item
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);

  // 2. Create a todo item for user A
  const todoTitle: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todoItems.create(connection, {
      body: todoTitle satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // 3. Switch to user B by authenticating a new user
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: "password456",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);

  // 4. Attempt to retrieve user A's todo item as user B (should fail with 404)
  await TestValidator.error(
    "user B should not be able to retrieve user A's todo item",
    async () => {
      await api.functional.todoList.user.todoItems.at(connection, {
        todoId: createdTodo.id,
      });
    },
  );
}
