import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete workflow of updating a todo item by an authenticated user.
 *
 * This scenario validates that a user can successfully modify various aspects
 * of their todo item including title, description, status, priority, due date,
 * and completion status. The test creates a new user account, creates a todo
 * item, then updates multiple fields of that todo to verify the update
 * operation works correctly.
 *
 * Test Flow:
 *
 * 1. Register a new user account and obtain authentication
 * 2. Create an initial todo item with default values
 * 3. Update the todo with modified field values
 * 4. Validate all updated fields reflect the changes
 * 5. Verify system timestamps are properly maintained
 */
export async function test_api_todo_update_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "securePassword123";

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Verify user creation and authentication token
  TestValidator.predicate(
    "user email matches",
    createdUser.email === userEmail,
  );
  TestValidator.predicate(
    "authentication token exists",
    createdUser.token.access.length > 0,
  );

  // Step 2: Create an initial todo item
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const initialDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: initialTitle,
        description: initialDescription,
        status: "pending",
        priority: "medium",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify initial todo creation
  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "created todo description matches",
    createdTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "created todo status is pending",
    createdTodo.status,
    "pending",
  );
  TestValidator.equals(
    "created todo priority is medium",
    createdTodo.priority,
    "medium",
  );
  TestValidator.equals(
    "created todo is not completed",
    createdTodo.completed,
    false,
  );

  // Step 3: Update the todo with modified values
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const updatedDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const completedAtTimestamp = new Date().toISOString();

  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        status: "in_progress",
        priority: "high",
        due_date: updatedDueDate,
        completed: true,
        completed_at: completedAtTimestamp,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Validate all updated fields
  TestValidator.equals(
    "updated todo ID unchanged",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "updated todo title matches",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated todo description matches",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated todo status is in_progress",
    updatedTodo.status,
    "in_progress",
  );
  TestValidator.equals(
    "updated todo priority is high",
    updatedTodo.priority,
    "high",
  );
  TestValidator.equals(
    "updated todo due_date matches",
    updatedTodo.due_date,
    updatedDueDate,
  );
  TestValidator.equals(
    "updated todo is completed",
    updatedTodo.completed,
    true,
  );
  TestValidator.equals(
    "updated todo completed_at matches",
    updatedTodo.completed_at,
    completedAtTimestamp,
  );

  // Step 5: Verify system-managed timestamps
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is after created_at",
    new Date(updatedTodo.updated_at).getTime() >=
      new Date(createdTodo.created_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at timestamp reflects update operation",
    new Date(updatedTodo.updated_at).getTime() >
      new Date(createdTodo.updated_at).getTime(),
  );
}
