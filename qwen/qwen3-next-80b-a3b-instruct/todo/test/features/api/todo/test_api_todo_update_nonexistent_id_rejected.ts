import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_nonexistent_id_rejected(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new user to establish context
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a valid todo item to ensure the user has one
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // 3. Attempt to update a non-existent todo item with fabricated UUID
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>(); // Use random UUID
  await TestValidator.error(
    "updating non-existent todo should reject with 404 error",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: nonExistentTodoId,
        body: {
          text: "Updated text for non-existent todo",
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
