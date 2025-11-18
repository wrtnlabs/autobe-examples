import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating only the description field without affecting other fields.
 *
 * This test validates that partial updates work correctly when changing only
 * the description of a todo. It verifies that when updating just the
 * description, other fields (title, completed, priority, due_date) remain
 * unchanged. The test also covers clearing the description by setting it to
 * null, and confirms that the updated_at timestamp is refreshed to reflect the
 * modification time.
 *
 * Steps:
 *
 * 1. Authenticate user to establish authenticated session
 * 2. Create a todo with initial description and other fields
 * 3. Update only the description field to a new value
 * 4. Verify description changed while other fields remained the same
 * 5. Verify updated_at timestamp was refreshed
 * 6. Update description to null (clear it)
 * 7. Verify description is cleared while other fields still match
 * 8. Verify updated_at timestamp was refreshed again
 */
export async function test_api_todo_update_description_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/todos",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create initial todo with description and other fields
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialPriority = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);
  const dueDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: initialTitle,
        description: initialDescription,
        priority: initialPriority,
        due_date: dueDate,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Store original values for comparison
  const originalTitle = createdTodo.title;
  const originalCompleted = createdTodo.completed;
  const originalPriority = createdTodo.priority;
  const originalDueDate = createdTodo.due_date;
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;

  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Update only description to new value
  const newDescription = RandomGenerator.paragraph({ sentences: 8 });
  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        description: newDescription,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify description changed while other fields remained the same
  TestValidator.equals(
    "description should be updated",
    updatedTodo.description,
    newDescription,
  );
  TestValidator.equals(
    "title should not change",
    updatedTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "completed should not change",
    updatedTodo.completed,
    originalCompleted,
  );
  TestValidator.equals(
    "priority should not change",
    updatedTodo.priority,
    originalPriority,
  );
  TestValidator.equals(
    "due_date should not change",
    updatedTodo.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "created_at should not change",
    updatedTodo.created_at,
    originalCreatedAt,
  );

  // Step 5: Verify updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedTodo.updated_at,
    originalUpdatedAt,
  );

  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Update description to null (clear it)
  const clearedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        description: null,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(clearedTodo);

  // Step 7: Verify description is cleared while other fields still match
  TestValidator.equals(
    "description should be null",
    clearedTodo.description,
    null,
  );
  TestValidator.equals(
    "title should still not change",
    clearedTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "completed should still not change",
    clearedTodo.completed,
    originalCompleted,
  );
  TestValidator.equals(
    "priority should still not change",
    clearedTodo.priority,
    originalPriority,
  );
  TestValidator.equals(
    "due_date should still not change",
    clearedTodo.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "created_at should still not change",
    clearedTodo.created_at,
    originalCreatedAt,
  );

  // Step 8: Verify updated_at timestamp was refreshed again
  TestValidator.notEquals(
    "updated_at should be refreshed again",
    clearedTodo.updated_at,
    updatedTodo.updated_at,
  );
}
