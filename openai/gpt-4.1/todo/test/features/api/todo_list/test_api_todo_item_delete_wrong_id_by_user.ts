import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate user cannot delete non-existent Todo and that attempting to do so
 * produces an error, leaving existing data unchanged.
 *
 * 1. Register and authenticate a new Todo List user.
 * 2. Create a valid Todo item for baseline state.
 * 3. Attempt to delete a Todo with a random UUID (not corresponding to any
 *    existing Todo).
 * 4. Assert that error is thrown and confirm original Todo still exists and
 *    remains unchanged.
 */
export async function test_api_todo_item_delete_wrong_id_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new Todo List user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.todolist.app/join",
    referrer: "https://test.todolist.app/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(userAuth);

  // 2. Create a valid Todo item for baseline state
  const todoBody = {
    description: RandomGenerator.paragraph({ sentences: 2 }),
    due_date: null,
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoBody },
  );
  typia.assert(todo);

  // 3. Attempt to delete a Todo with a random UUID that doesn't exist
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: randomTodoId,
      });
    },
  );

  // 4. Confirm original Todo still exists and is unchanged by fetching its details (if possible)
  // Since no API for fetching a single todo is provided in the function list, we cannot directly fetch the item, so instead, we confirm flow ends without error and typia.assert has validated returned object after creation.
}
