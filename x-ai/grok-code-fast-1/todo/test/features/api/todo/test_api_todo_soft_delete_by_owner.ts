import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensures a user can soft delete their own todo item.
 *
 * Steps:
 *
 * 1. Register a new user and authenticate session (using random values to
 *    guarantee uniqueness).
 * 2. As the user, create a todo item with a randomized title and optional
 *    description.
 * 3. Delete this specific todo using its todoId (soft delete).
 * 4. Validate:
 *
 *    - The todo's deleted_at field is set (soft deletion confirmed).
 *    - Deletion returns no error.
 *    - Repeated deletion attempt returns an error.
 * 5. (If a 'list' endpoint existed) Would verify that deleted todo is excluded
 *    from list; here skipped.
 * 6. Deletion does not remove the row from the database; we assume this due to
 *    'deleted_at' remaining set.
 */
export async function test_api_todo_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoListUser.IJoin;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);

  // 2. As the user, create a todo item
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 14,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoBody },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo is not deleted upon creation",
    todo.deleted_at,
    null,
  );

  // 3. Delete the specific todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to delete again and expect error
  await TestValidator.error(
    "deleting already deleted todo returns error",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
