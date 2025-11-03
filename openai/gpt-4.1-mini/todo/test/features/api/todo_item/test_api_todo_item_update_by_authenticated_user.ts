import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test updating an existing todo item by ID for the authenticated user.
 *
 * 1. Register a new user account using /auth/user/join to establish user context
 *    and authentication.
 * 2. Create a new todo item for the authenticated user at /todo/user/todoItems.
 * 3. Update the newly created todo item by its ID via PUT
 *    /todo/user/todoItems/{todoItemId}, modifying description, status, and due
 *    date.
 * 4. Validate that the update response returns the correct updated values and
 *    timestamps are properly maintained.
 *
 * This test ensures ownership enforcement and correct role-based operation for
 * authenticated users managing their todo items.
 */
export async function test_api_todo_item_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: password,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a new todo item
  const todoItemCreateBody = {
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "pending",
    due_date: new Date(Date.now() + 86400_000 * 3).toISOString(), // due 3 days later
  } satisfies ITodoItem.ICreate;
  const todoItem: ITodoItem = await api.functional.todo.user.todoItems.create(
    connection,
    {
      body: todoItemCreateBody,
    },
  );
  typia.assert(todoItem);

  // 3. Update the todo item
  const todoItemUpdateBody = {
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "completed",
    due_date: new Date(Date.now() + 86400_000 * 7).toISOString(), // due in 7 days
  } satisfies ITodoItem.IUpdate;
  const updatedTodoItem: ITodoItem =
    await api.functional.todo.user.todoItems.update(connection, {
      todoItemId: todoItem.id,
      body: todoItemUpdateBody,
    });
  typia.assert(updatedTodoItem);

  // 4. Validate update results
  TestValidator.equals("todo item id matches", updatedTodoItem.id, todoItem.id);
  TestValidator.equals(
    "todo item description updated",
    updatedTodoItem.description,
    todoItemUpdateBody.description,
  );
  TestValidator.equals(
    "todo item status updated",
    updatedTodoItem.status,
    todoItemUpdateBody.status,
  );
  // due_date can be null or string (null not expected in this update)
  TestValidator.equals(
    "todo item due date updated",
    updatedTodoItem.due_date,
    todoItemUpdateBody.due_date,
  );
  // timestamps check: created_at remains same
  TestValidator.equals(
    "todo item created_at unchanged",
    updatedTodoItem.created_at,
    todoItem.created_at,
  );
  // updated_at should be newer (later) timestamp than original
  TestValidator.predicate(
    "todo item updated_at is more recent",
    new Date(updatedTodoItem.updated_at).getTime() >
      new Date(todoItem.updated_at).getTime(),
  );
}
