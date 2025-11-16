import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of a todo that has been marked as complete.
 *
 * This test validates the complete todo retrieval workflow by:
 *
 * 1. Creating a user account through authentication
 * 2. Creating a new todo item with title and description
 * 3. Marking the todo as complete via update operation
 * 4. Retrieving the completed todo by ID
 * 5. Verifying completion status and temporal tracking
 *
 * The test ensures that completed todos are properly represented with:
 *
 * - Is_completed = true
 * - Completed_at contains a valid ISO 8601 timestamp
 * - Updated_at reflects the completion time
 * - All temporal metadata is accurately maintained
 */
export async function test_api_todo_retrieval_completed_todo(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authenticatedUser);
  TestValidator.equals(
    "user authenticated successfully",
    authenticatedUser.email,
    userEmail,
  );

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "todo created with correct title",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo created with correct description",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "newly created todo is not completed",
    createdTodo.is_completed,
    false,
  );
  TestValidator.predicate(
    "newly created todo has null completed_at",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );

  // Step 3: Mark the todo as complete via update operation
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        is_completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(completedTodo);
  TestValidator.equals(
    "todo marked as completed",
    completedTodo.is_completed,
    true,
  );
  TestValidator.predicate(
    "completed_at is set after marking complete",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // Step 4: Retrieve the completed todo by ID
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 5: Verify completion status
  TestValidator.equals(
    "retrieved todo has correct ID",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo is marked as completed",
    retrievedTodo.is_completed,
    true,
  );

  // Step 6: Verify completed_at timestamp is valid
  TestValidator.predicate(
    "completed_at is not null",
    retrievedTodo.completed_at !== null &&
      retrievedTodo.completed_at !== undefined,
  );
  const completedAtDate = new Date(retrievedTodo.completed_at!);
  TestValidator.predicate(
    "completed_at is valid ISO 8601 timestamp",
    !isNaN(completedAtDate.getTime()),
  );

  // Step 7: Verify updated_at reflects the completion time
  TestValidator.predicate(
    "updated_at is not null",
    retrievedTodo.updated_at !== null && retrievedTodo.updated_at !== undefined,
  );
  const updatedAtDate = new Date(retrievedTodo.updated_at);
  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    !isNaN(updatedAtDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedAtDate >= new Date(retrievedTodo.created_at),
  );

  // Step 8: Validate temporal consistency
  const createdAtDate = new Date(retrievedTodo.created_at);
  TestValidator.predicate(
    "completed_at is after or equal to created_at",
    new Date(retrievedTodo.completed_at!) >= createdAtDate,
  );
  TestValidator.predicate(
    "completed_at is before or equal to updated_at",
    new Date(retrievedTodo.completed_at!) <= updatedAtDate,
  );

  // Final validation: Verify the todo maintains all original properties
  TestValidator.equals(
    "retrieved todo maintains original title",
    retrievedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "retrieved todo maintains original description",
    retrievedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "retrieved todo belongs to authenticated user",
    retrievedTodo.todo_app_user_id,
    authenticatedUser.id,
  );
}
