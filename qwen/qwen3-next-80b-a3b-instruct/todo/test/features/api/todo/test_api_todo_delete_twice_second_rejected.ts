import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_delete_twice_second_rejected(
  connection: api.IConnection,
) {
  // Step 1: Join as a new user to establish authentication context
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a single todo item to be deleted
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Step 3: Delete the todo item (first attempt)
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // Step 4: Attempt to delete the same todo item again (second attempt)
  // This should fail with 404 since the item no longer exists
  await TestValidator.error(
    "second deletion of same todo item should fail with 404",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
