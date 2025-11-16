import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate the creation response includes all required fields with correct
 * values and data types.
 *
 * When a user creates a todo, the API response should include the complete todo
 * entity with all fields properly populated. This test verifies that:
 *
 * - The response includes all required fields (id, title, description,
 *   is_completed, timestamps, etc.)
 * - All field values have correct data types matching the schema
 * - Default values are correctly set (is_completed = false, completed_at = null)
 * - The user summary is included with id and email
 * - The created_at and updated_at timestamps are ISO 8601 format
 * - No follow-up read operation is needed to get the created todo
 *
 * Steps:
 *
 * 1. Create a new user account via authentication
 * 2. Create a new todo with title and optional description
 * 3. Validate the response contains all expected fields with correct types
 * 4. Verify default values (is_completed = false, completed_at = null)
 * 5. Verify user ownership is properly established (todo_app_user_id matches
 *    authenticated user)
 * 6. Confirm user summary object is included with correct structure
 */
export async function test_api_todo_creation_response_contains_correct_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: password,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/register",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo with title and description
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    });

  // Step 3: Validate complete response structure with typia
  typia.assert(createdTodo);

  // Step 4: Verify business logic - default values are correctly set
  TestValidator.equals(
    "todo is not completed by default",
    createdTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at is null for newly created todo",
    createdTodo.completed_at,
    null,
  );

  // Step 5: Verify user ownership relationship
  TestValidator.equals(
    "todo is assigned to authenticated user",
    createdTodo.todo_app_user_id,
    user.id,
  );

  // Step 6: Verify user summary is included with correct relationship
  TestValidator.equals(
    "user summary id matches authenticated user id",
    createdTodo.user.id,
    user.id,
  );
  TestValidator.equals(
    "user summary email matches authenticated user email",
    createdTodo.user.email,
    user.email,
  );

  // Step 7: Verify timestamps are equal for newly created todo
  TestValidator.equals(
    "created_at and updated_at are identical for new todo",
    createdTodo.created_at,
    createdTodo.updated_at,
  );

  // Step 8: Verify input data is preserved in response
  TestValidator.equals(
    "todo title matches provided input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description matches provided input",
    createdTodo.description,
    todoDescription,
  );
}
