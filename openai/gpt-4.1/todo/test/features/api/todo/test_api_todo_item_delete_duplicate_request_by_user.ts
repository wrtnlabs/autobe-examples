import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test idempotency and error response when a user attempts to delete the same
 * Todo item multiple times.
 *
 * 1. Register and authenticate a user via the /auth/user/join endpoint
 * 2. Create a new Todo item with POST /todoList/user/todos
 * 3. DELETE the Todo item by id (DELETE /todoList/user/todos/{todoId})
 * 4. Attempt to DELETE again using the same id
 * 5. Verify the second deletion fails with a suitable error and the system remains
 *    stable
 */
export async function test_api_todo_item_delete_duplicate_request_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const joinBody = {
    email,
    password,
    href: "https://test-todo.app/join",
    referrer: "https://test-todo.app/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);
  TestValidator.equals("user email matches input", user.email, email);

  // 2. Create a todo item
  const todoBody = {
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoBody },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo description matches",
    todo.description,
    todoBody.description,
  );
  TestValidator.equals("todo user id matches", todo.user.id, user.id);

  // 3. DELETE the Todo item
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to DELETE again, should fail (already deleted)
  await TestValidator.error(
    "second delete should fail (idempotent error)",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
