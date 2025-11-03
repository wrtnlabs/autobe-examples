import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test retrieving a specific todo item by its unique ID for an authenticated
 * user.
 *
 * This test simulates that a user first signs up through the auth join
 * endpoint, then creates a todo item, and finally retrieves that todo item by
 * id. It ensures that the authenticated user can access the todo item they own
 * and receives all details correctly. It also implicitly checks ownership
 * enforcement by expecting retrieval to match created item data.
 *
 * Steps:
 *
 * 1. User signs up, receiving authorization tokens automatically.
 * 2. Authenticated user creates a new todo item with description, status, and
 *    optional due date.
 * 3. Retrieves the created todo item by its ID.
 * 4. Validates the retrieved data matches what was created, including all required
 *    fields.
 */
export async function test_api_todo_item_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Sign up a new user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies ITodoUser.ICreate;

  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a todo item for this user
  const todoCreateBody = {
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "pending",
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  } satisfies ITodoItem.ICreate;

  const createdTodo: ITodoItem =
    await api.functional.todo.user.todoItems.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 3. Retrieve the todo item by ID
  const retrievedTodo: ITodoItem = await api.functional.todo.user.todoItems.at(
    connection,
    {
      todoItemId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);

  // 4. Validate retrieved todo matches created todo
  TestValidator.equals(
    "todo item id matches",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "todo status matches",
    retrievedTodo.status,
    todoCreateBody.status,
  );
  TestValidator.equals(
    "todo due_date matches",
    retrievedTodo.due_date,
    todoCreateBody.due_date,
  );
  TestValidator.equals(
    "todo created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "todo updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
}
