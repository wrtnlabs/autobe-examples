import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating only the title field of an existing todo while keeping all
 * other fields unchanged.
 *
 * This test validates selective field updates in the todo update endpoint. It
 * creates a todo with complete data (title, description, priority, due date),
 * then updates only the title field to a new value. The test verifies that all
 * other fields (description, priority, due_date, completion status, timestamps)
 * remain unchanged, demonstrating proper partial update functionality.
 *
 * Process:
 *
 * 1. Register a new user for testing
 * 2. Create a todo with all optional fields set (description, priority, due_date)
 * 3. Update the todo with only the title field modified
 * 4. Verify title changed while all other fields remain unchanged
 * 5. Confirm created_at is immutable and updated_at is refreshed
 */
export async function test_api_todo_update_title_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo with all optional fields
  const originalDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const originalDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const originalPriority = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        description: originalDescription,
        priority: originalPriority,
        due_date: originalDueDate,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Store original values for comparison
  const originalTitle = createdTodo.title;
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;

  // Step 3: Update only the title field
  const newTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify title changed
  TestValidator.notEquals(
    "title should be updated",
    updatedTodo.title,
    originalTitle,
  );
  TestValidator.equals("new title matches", updatedTodo.title, newTitle);

  // Step 5: Verify all other fields remain unchanged
  TestValidator.equals(
    "description should remain unchanged",
    updatedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    updatedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "due_date should remain unchanged",
    updatedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "completed status should remain unchanged",
    updatedTodo.completed,
    createdTodo.completed,
  );
  TestValidator.equals(
    "completed_at should remain unchanged",
    updatedTodo.completed_at,
    createdTodo.completed_at,
  );

  // Step 6: Verify timestamps
  TestValidator.equals(
    "created_at should be immutable",
    updatedTodo.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );
}
