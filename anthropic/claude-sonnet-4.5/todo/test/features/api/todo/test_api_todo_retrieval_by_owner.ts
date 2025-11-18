import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete workflow of retrieving a todo item by its ID as the
 * authenticated owner.
 *
 * This test validates the end-to-end flow of todo retrieval:
 *
 * 1. Register and authenticate a new user account
 * 2. Create a new todo item under the authenticated user
 * 3. Retrieve the specific todo by its UUID
 * 4. Validate complete todo entity structure with all fields
 *
 * The test ensures that newly created todos have:
 *
 * - Valid UUID identifier
 * - Correct owner association
 * - Title matching the creation request
 * - Default incomplete status (completed: false)
 * - Null completion timestamp (completed_at: null)
 * - Valid creation and update timestamps
 * - Null deletion timestamp (deleted_at: null)
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const createUserBody = {
    email: userEmail,
    password: userPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createTodoBody = {
    title: todoTitle,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the created todo by its ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate the complete todo entity structure
  TestValidator.equals(
    "retrieved todo ID matches created todo",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo owner matches authenticated user",
    retrievedTodo.todo_list_user_id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "todo title matches creation request",
    retrievedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "new todo is not completed",
    retrievedTodo.completed,
    false,
  );
  TestValidator.equals(
    "new todo has null completion timestamp",
    retrievedTodo.completed_at,
    null,
  );
  TestValidator.predicate(
    "todo has valid creation timestamp",
    retrievedTodo.created_at !== null && retrievedTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "todo has valid update timestamp",
    retrievedTodo.updated_at !== null && retrievedTodo.updated_at !== undefined,
  );
  TestValidator.equals(
    "new todo has null deletion timestamp",
    retrievedTodo.deleted_at,
    null,
  );
}
