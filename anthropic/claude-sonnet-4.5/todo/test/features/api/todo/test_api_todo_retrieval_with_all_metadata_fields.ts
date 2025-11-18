import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving a todo and verify that all metadata fields are present and
 * correctly formatted in the response.
 *
 * This test validates the complete ITodoListTodo schema contract by:
 *
 * 1. Registering and authenticating a user
 * 2. Creating a new todo item
 * 3. Retrieving the todo by its ID
 * 4. Validating all metadata fields including UUID formats, timestamps, and null
 *    values
 *
 * The typia.assert() function performs complete validation of all metadata
 * fields including:
 *
 * - UUID format for id and todo_list_user_id
 * - String type for title
 * - Boolean type for completed
 * - ISO 8601 date-time format for created_at and updated_at
 * - Proper handling of nullable fields (completed_at, deleted_at)
 */
export async function test_api_todo_retrieval_with_all_metadata_fields(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a user
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateData,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create a new todo item
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoCreateData,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the created todo by its ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate business logic - typia.assert() has already validated all type formats

  // Validate that retrieved todo matches created todo
  TestValidator.equals(
    "retrieved todo id should match created todo id",
    retrievedTodo.id,
    createdTodo.id,
  );

  TestValidator.equals(
    "retrieved todo title should match created todo title",
    retrievedTodo.title,
    createdTodo.title,
  );

  // Validate completed_at is null for newly created incomplete todo
  TestValidator.equals(
    "completed_at should be null for incomplete todo",
    retrievedTodo.completed_at,
    null,
  );

  // Validate deleted_at is null for non-deleted todo
  TestValidator.equals(
    "deleted_at should be null for non-deleted todo",
    retrievedTodo.deleted_at,
    null,
  );
}
