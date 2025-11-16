import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that the system correctly assigns creation and modification timestamps.
 *
 * Validates that when a user creates a new todo item, the system automatically
 * assigns creation and modification timestamps that:
 *
 * 1. Are recorded and properly set
 * 2. Are identical upon creation (created_at equals updated_at)
 * 3. Have completed_at set to null since the todo is not yet complete
 * 4. Are properly tracked alongside the todo data
 * 5. Demonstrate proper system management of temporal metadata
 *
 * This test demonstrates proper system management of temporal metadata for task
 * lifecycle tracking and audit purposes.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Prepare todo creation data with title and description
 * 3. Create a todo through the API
 * 4. Validate that created_at and updated_at are set
 * 5. Confirm created_at and updated_at are identical
 * 6. Ensure completed_at is null (not yet marked complete)
 * 7. Validate todo ownership and user association
 * 8. Verify is_completed is false (default state)
 * 9. Confirm todo data matches input
 */
export async function test_api_todo_creation_automatic_timestamp_assignment(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Prepare todo creation data with title and description
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 6,
    }),
  } satisfies ITodoAppTodo.ICreate;

  // 3. Create a todo through the API
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: todoCreateData,
    });
  typia.assert(createdTodo);

  // 4. Validate that created_at and updated_at timestamps are set
  TestValidator.predicate(
    "created_at timestamp should be set",
    createdTodo.created_at !== null && createdTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be set",
    createdTodo.updated_at !== null && createdTodo.updated_at !== undefined,
  );

  // 5. Confirm created_at and updated_at are identical (no modification yet)
  TestValidator.equals(
    "created_at and updated_at should be identical upon creation",
    createdTodo.created_at,
    createdTodo.updated_at,
  );

  // 6. Ensure completed_at is null (not yet marked complete)
  TestValidator.equals(
    "completed_at should be null since todo is not yet complete",
    createdTodo.completed_at,
    null,
  );

  // 7. Validate todo ownership and user association
  TestValidator.equals(
    "todo should be owned by the authenticated user",
    createdTodo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals(
    "todo user id should match authenticated user",
    createdTodo.user.id,
    user.id,
  );
  TestValidator.equals(
    "todo user email should match authenticated user email",
    createdTodo.user.email,
    user.email,
  );

  // 8. Verify is_completed is false (default state)
  TestValidator.predicate(
    "todo should be marked as incomplete by default",
    createdTodo.is_completed === false,
  );

  // 9. Confirm todo data matches input provided
  TestValidator.equals(
    "todo title should match input",
    createdTodo.title,
    todoCreateData.title,
  );
  TestValidator.equals(
    "todo description should match input",
    createdTodo.description,
    todoCreateData.description,
  );
}
