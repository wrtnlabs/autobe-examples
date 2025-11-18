import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_item_retrieval_unauthenticated(
  connection: api.IConnection,
) {
  // Create a new user account
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Create a todo item for the authenticated user
  const todo: ITodoListTodo =
    await api.functional.todoList.user.todoItems.create(connection, {
      body: "Complete test scenario" satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todo);

  // Create an unauthenticated connection (empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Verify that unauthenticated access to the todo item fails with 401 Unauthorized
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.todoList.user.todoItems.at(unauthConnection, {
      todoId: todo.id,
    });
  });
}
