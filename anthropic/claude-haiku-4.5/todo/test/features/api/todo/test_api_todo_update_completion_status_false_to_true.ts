import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test marking an incomplete todo as complete.
 *
 * User creates a todo in incomplete state (is_completed = false), then updates
 * it to is_completed = true. Verify the todo is marked as complete,
 * completed_at is set to a valid current timestamp (not null), updated_at
 * reflects the change time, and other fields remain unchanged.
 *
 * This test validates the system properly tracks completion time when a todo is
 * first marked complete.
 *
 * Workflow:
 *
 * 1. Create a user account with authentication
 * 2. Create a new todo with is_completed = false
 * 3. Verify initial todo state has no completed_at timestamp
 * 4. Update the todo to mark as complete (is_completed = true)
 * 5. Verify completed_at is set to current timestamp
 * 6. Verify updated_at reflects the change time
 * 7. Verify other fields (title, description, user) remain unchanged
 */
export async function test_api_todo_update_completion_status_false_to_true(
  connection: api.IConnection,
) {
  // Step 1: Create a user account with authentication
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ICreate;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userCreateBody,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo with is_completed = false
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
  } satisfies ITodoAppTodo.ICreate;

  const incompleteTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(incompleteTodo);

  // Step 3: Verify initial todo state has no completed_at timestamp
  TestValidator.equals(
    "is_completed should be false initially",
    incompleteTodo.is_completed,
    false,
  );
  TestValidator.predicate(
    "completed_at should be null initially",
    incompleteTodo.completed_at === null ||
      incompleteTodo.completed_at === undefined,
  );

  // Step 4: Update the todo to mark as complete (is_completed = true)
  const updateBody = {
    is_completed: true,
  } satisfies ITodoAppTodo.IUpdate;

  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: incompleteTodo.id,
      body: updateBody,
    });
  typia.assert(completedTodo);

  // Step 5: Verify completed_at is set to current timestamp
  TestValidator.equals(
    "is_completed should be true after update",
    completedTodo.is_completed,
    true,
  );
  TestValidator.predicate(
    "completed_at should be set to a timestamp",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // Verify completed_at is a valid ISO 8601 date-time string
  TestValidator.predicate(
    "completed_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      completedTodo.completed_at || "",
    ),
  );

  // Step 6: Verify updated_at reflects the change time
  TestValidator.predicate(
    "updated_at should be after original creation time",
    new Date(completedTodo.updated_at) >= new Date(incompleteTodo.updated_at),
  );

  // Step 7: Verify other fields (title, description, user) remain unchanged
  TestValidator.equals(
    "title should remain unchanged",
    completedTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "description should remain unchanged",
    completedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo ID should remain unchanged",
    completedTodo.id,
    incompleteTodo.id,
  );
  TestValidator.equals(
    "user ID should remain unchanged",
    completedTodo.todo_app_user_id,
    incompleteTodo.todo_app_user_id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    completedTodo.created_at,
    incompleteTodo.created_at,
  );
}
