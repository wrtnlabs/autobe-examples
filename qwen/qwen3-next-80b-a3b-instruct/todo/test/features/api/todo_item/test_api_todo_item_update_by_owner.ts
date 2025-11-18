import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_item_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Authenticate as user to create and own the todo item
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAuth);

  // 2. Create a todo item that will be updated in this test
  const todoItem: ITodoListTodo =
    await api.functional.todoList.user.todoItems.create(connection, {
      body: "Initial Todo Title" satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoItem);

  // 3. Update the todo item's title and completion status
  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todoItems.update(connection, {
      todoId: todoItem.id,
      body: "Updated Todo Title" satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // 4. Validate the updated values
  TestValidator.equals(
    "updated title matches",
    updatedTodo.title,
    "Updated Todo Title",
  );
  TestValidator.equals(
    "completion status remains unchanged",
    updatedTodo.completed,
    false,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedTodo.updated_at,
    todoItem.updated_at,
  );
}
