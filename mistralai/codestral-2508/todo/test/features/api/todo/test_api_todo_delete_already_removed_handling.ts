import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that attempting to delete a todo that has already been deleted
 * returns an appropriate error or is idempotent.
 *
 * 1. User joins (register)
 * 2. User creates a todo
 * 3. User deletes the todo
 * 4. User attempts to delete the same todo again; this must result in an error or
 *    be handled idempotently per permanent deletion rules
 */
export async function test_api_todo_delete_already_removed_handling(
  connection: api.IConnection,
) {
  // 1. User registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const joinOutput = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      href: "https://test.joinauth.local/",
      referrer: "https://referrer.autobe.test/",
      display_name: RandomGenerator.name(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinOutput);

  // 2. Create todo
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: todoInput,
  });
  typia.assert(todo);

  // 3. Delete the todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to delete already-deleted todo again
  await TestValidator.error(
    "Deleting an already removed todo should throw error or be idempotently ignored",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
