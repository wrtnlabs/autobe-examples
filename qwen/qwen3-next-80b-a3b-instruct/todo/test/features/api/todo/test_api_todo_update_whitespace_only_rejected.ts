import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_whitespace_only_rejected(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a new user to create a todo item
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "securePassword123",
        ip: null, // Optional property - explicitly set to null
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo item with valid text
  const todoText: string = "Complete my assignment";
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        text: todoText,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Attempt to update the todo item with whitespace-only text (should be rejected)
  await TestValidator.error(
    "whitespace-only text update should be rejected",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: createdTodo.id,
        body: {
          text: "    ", // Only whitespace - should violate minimum length constraint
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
