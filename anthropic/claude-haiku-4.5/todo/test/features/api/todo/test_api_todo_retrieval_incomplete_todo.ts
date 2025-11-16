import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of a todo that has not been marked as complete.
 *
 * This test validates that a newly created todo in its initial incomplete state
 * is properly retrieved with the correct properties:
 *
 * - Is_completed should be false (not marked complete)
 * - Completed_at should be null (no completion timestamp)
 * - Updated_at should equal created_at (no modifications made since creation)
 *
 * The test demonstrates the complete workflow: user registration, todo
 * creation, and retrieval verification. It ensures the system correctly
 * represents incomplete todos and maintains temporal data integrity.
 *
 * Workflow:
 *
 * 1. Register a new user account
 * 2. Create a new todo item with title and optional description
 * 3. Retrieve the created todo by its ID
 * 4. Verify is_completed is false for new todo
 * 5. Verify completed_at is null for incomplete todo
 * 6. Verify updated_at equals created_at (no modifications)
 * 7. Validate all todo properties are correctly populated
 */
export async function test_api_todo_retrieval_incomplete_todo(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userHref = typia.random<string & tags.Format<"uri">>();
  const userReferrer = typia.random<string & tags.Format<"uri">>();

  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "securePassword123",
        href: userHref,
        referrer: userReferrer,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 1,
    wordMax: 5,
  });
  const todoDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 2,
    wordMax: 8,
  });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the created todo by its ID
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Verify is_completed is false for new todo
  TestValidator.equals(
    "newly created todo should not be marked complete",
    retrievedTodo.is_completed,
    false,
  );

  // Step 5: Verify completed_at is null for incomplete todo
  TestValidator.equals(
    "incomplete todo should have null completed_at timestamp",
    retrievedTodo.completed_at,
    null,
  );

  // Step 6: Verify updated_at equals created_at (no modifications)
  TestValidator.equals(
    "todo updated_at should equal created_at for unmodified todo",
    retrievedTodo.updated_at,
    retrievedTodo.created_at,
  );

  // Step 7: Validate all todo properties are correctly populated
  TestValidator.equals(
    "retrieved todo ID should match created todo ID",
    retrievedTodo.id,
    createdTodo.id,
  );

  TestValidator.equals(
    "retrieved todo title should match created todo title",
    retrievedTodo.title,
    todoTitle,
  );

  TestValidator.equals(
    "retrieved todo description should match created todo description",
    retrievedTodo.description,
    todoDescription,
  );

  TestValidator.predicate(
    "todo should have valid user reference",
    retrievedTodo.todo_app_user_id === authenticatedUser.id,
  );

  TestValidator.predicate(
    "retrieved todo user summary should match authenticated user",
    retrievedTodo.user.id === authenticatedUser.id &&
      retrievedTodo.user.email === authenticatedUser.email,
  );
}
