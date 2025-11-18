import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a todo with an empty request body (no fields specified).
 *
 * Verify that all fields retain their original values and updated_at is not
 * unnecessarily changed (or only updates if the system chooses to). This
 * validates that omitting fields in partial updates preserves existing values.
 *
 * Process:
 *
 * 1. Register a new user account
 * 2. Create a todo item with complete data (title, description, priority,
 *    due_date)
 * 3. Capture the original todo state including updated_at timestamp
 * 4. Send an empty update request (PUT with no fields in body)
 * 5. Retrieve the updated todo
 * 6. Verify all fields remain unchanged from the original values
 * 7. Verify that updated_at either stays the same or updates appropriately
 */
export async function test_api_todo_update_empty_request_body(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
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

  // Step 2: Create a todo with complete data
  const originalTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "high",
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(originalTodo);

  // Step 3: Capture original state
  const originalTitle = originalTodo.title;
  const originalDescription = originalTodo.description;
  const originalCompleted = originalTodo.completed;
  const originalPriority = originalTodo.priority;
  const originalDueDate = originalTodo.due_date;
  const originalUpdatedAt = originalTodo.updated_at;

  // Step 4: Send empty update request
  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: originalTodo.id,
      body: {} satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 5: Verify all fields remain unchanged
  TestValidator.equals(
    "title should remain unchanged after empty update",
    updatedTodo.title,
    originalTitle,
  );

  TestValidator.equals(
    "description should remain unchanged after empty update",
    updatedTodo.description,
    originalDescription,
  );

  TestValidator.equals(
    "completed status should remain unchanged after empty update",
    updatedTodo.completed,
    originalCompleted,
  );

  TestValidator.equals(
    "priority should remain unchanged after empty update",
    updatedTodo.priority,
    originalPriority,
  );

  TestValidator.equals(
    "due_date should remain unchanged after empty update",
    updatedTodo.due_date,
    originalDueDate,
  );

  // Step 6: Verify id and timestamps
  TestValidator.equals(
    "todo id should remain the same",
    updatedTodo.id,
    originalTodo.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updatedTodo.created_at,
    originalTodo.created_at,
  );

  // Step 7: Verify completed_at is still null (not marked complete)
  TestValidator.equals(
    "completed_at should be null when todo is not completed",
    updatedTodo.completed_at,
    null,
  );
}
