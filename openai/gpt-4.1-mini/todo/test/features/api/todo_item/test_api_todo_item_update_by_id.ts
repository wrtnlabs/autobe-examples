import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_item_update_by_id(
  connection: api.IConnection,
) {
  // 1. Authenticate user to obtain access token
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      },
    },
  );
  typia.assert(user);

  // 2. Create a new todo item
  const todoCreateBody = {
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "pending",
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoItem.ICreate;
  const todoItem: ITodoItem = await api.functional.todo.user.todoItems.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todoItem);

  // Verify initial todo item matches creation data
  TestValidator.equals(
    "Initial todo item description matches",
    todoItem.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "Initial todo item status is pending",
    todoItem.status,
    "pending",
  );
  TestValidator.equals(
    "Initial todo item due date matches",
    todoItem.due_date ?? null,
    todoCreateBody.due_date,
  );

  // 3. Update the todo item
  // Update description, status to "completed", and due date to 2 days from now
  const todoUpdateBody = {
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "completed",
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoItem.IUpdate;
  const updatedTodoItem: ITodoItem =
    await api.functional.todo.user.todoItems.update(connection, {
      todoItemId: todoItem.id,
      body: todoUpdateBody,
    });
  typia.assert(updatedTodoItem);

  // Verify updated todo item fields
  TestValidator.equals(
    "Updated todo item description matches",
    updatedTodoItem.description,
    todoUpdateBody.description,
  );
  TestValidator.equals(
    "Updated todo item status is completed",
    updatedTodoItem.status,
    "completed",
  );
  TestValidator.equals(
    "Updated todo item due date matches",
    updatedTodoItem.due_date ?? null,
    todoUpdateBody.due_date,
  );

  // Verify id remains the same
  TestValidator.equals(
    "Todo item id remains unchanged after update",
    updatedTodoItem.id,
    todoItem.id,
  );
}
