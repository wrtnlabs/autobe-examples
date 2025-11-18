import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensure authenticated user can delete their todo item.
 *
 * - Register a new user (with unique random email and valid strong password)
 * - Authenticate as this user (token is set automatically)
 * - Create a new todo item (owned by this user)
 * - Delete the created todo item
 * - Optionally confirm (by retry or business logic) that it cannot be accessed
 *   anymore
 * - Asserts that deletion succeeds and the user cannot access the deleted item
 */
export async function test_api_todo_item_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.todo.test/join",
    referrer: "https://app.todo.test/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.IJoin;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinInput },
  );
  typia.assert(user);

  // 2. Create a todo item for this user
  const todoInput = {
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }) as string,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 16,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoInput },
  );
  typia.assert(todo);
  TestValidator.equals("todo is created for user", todo.title, todoInput.title);

  // 3. Delete the todo item
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Try to delete again (should fail, confirm deletion)
  await TestValidator.error(
    "deleting already deleted todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
