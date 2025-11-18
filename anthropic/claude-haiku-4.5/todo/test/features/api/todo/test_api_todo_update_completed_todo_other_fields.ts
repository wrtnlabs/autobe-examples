import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a completed todo's other fields can be updated while maintaining
 * completed status.
 *
 * This test validates that once a todo is marked as complete, its other fields
 * (title, description, priority, due_date) can still be modified without
 * affecting the completed status or the completed_at timestamp. This ensures
 * that users can continue to edit completed todos for documentation or
 * organizational purposes.
 *
 * Test workflow:
 *
 * 1. User joins/authenticates
 * 2. Create a new todo with initial data
 * 3. Mark the todo as completed
 * 4. Record the completed_at timestamp
 * 5. Update the todo's title while keeping completed: true
 * 6. Verify completed status remains true
 * 7. Verify completed_at timestamp has not changed
 * 8. Verify the new title is applied
 * 9. Update other fields (description, priority) while completed: true
 * 10. Verify all changes are persisted while completed_at remains unchanged
 */
export async function test_api_todo_update_completed_todo_other_fields(
  connection: api.IConnection,
) {
  // Step 1: User authentication
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "initial completed status is false",
    todo.completed,
    false,
  );

  // Step 3 & 4: Mark the todo as completed and record the timestamp
  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(completedTodo);
  TestValidator.equals("todo is now completed", completedTodo.completed, true);
  TestValidator.predicate(
    "completed_at timestamp is set",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  const originalCompletedAt = completedTodo.completed_at;

  // Step 5: Update the todo's title while keeping completed: true
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedWithNewTitle: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: newTitle,
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedWithNewTitle);

  // Step 6: Verify completed status remains true
  TestValidator.equals(
    "completed status remains true",
    updatedWithNewTitle.completed,
    true,
  );

  // Step 7: Verify completed_at timestamp has not changed
  TestValidator.equals(
    "completed_at timestamp persists unchanged",
    updatedWithNewTitle.completed_at,
    originalCompletedAt,
  );

  // Step 8: Verify the new title is applied
  TestValidator.equals(
    "title has been updated",
    updatedWithNewTitle.title,
    newTitle,
  );

  // Step 9: Update other fields (description, priority) while completed: true
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const newPriority = RandomGenerator.pick(["low", "medium", "high"] as const);
  const updatedWithOtherFields: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        description: newDescription,
        priority: newPriority,
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedWithOtherFields);

  // Step 10: Verify all changes are persisted while completed_at remains unchanged
  TestValidator.equals(
    "completed status remains true",
    updatedWithOtherFields.completed,
    true,
  );
  TestValidator.equals(
    "completed_at timestamp still persists unchanged",
    updatedWithOtherFields.completed_at,
    originalCompletedAt,
  );
  TestValidator.equals(
    "description has been updated",
    updatedWithOtherFields.description,
    newDescription,
  );
  TestValidator.equals(
    "priority has been updated",
    updatedWithOtherFields.priority,
    newPriority,
  );
  TestValidator.equals(
    "title remains updated",
    updatedWithOtherFields.title,
    newTitle,
  );
}
