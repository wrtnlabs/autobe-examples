import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the completion tracking functionality when updating a todo's completed
 * status and completed_at timestamp.
 *
 * This scenario validates the interaction between the completed boolean field
 * and the completed_at timestamp field. The test creates a user, authenticates
 * them, creates a todo item, marks it as completed with a specific timestamp,
 * verifies the completion state, then marks it as incomplete by setting
 * completed to false and completed_at to null, and finally verifies that both
 * fields update correctly. This tests the completion time tracking feature that
 * enables task completion analytics.
 *
 * Steps:
 *
 * 1. Create and authenticate a new user
 * 2. Create a new todo item with incomplete status
 * 3. Mark the todo as completed with a specific completion timestamp
 * 4. Verify the todo is marked as completed with the correct timestamp
 * 5. Mark the todo as incomplete by clearing the completed flag and timestamp
 * 6. Verify the todo is marked as incomplete with null timestamp
 */
export async function test_api_todo_update_completion_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a new todo item with incomplete status
  const initialTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "pending",
        priority: "medium",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  TestValidator.equals(
    "initial todo should not be completed",
    initialTodo.completed,
    false,
  );
  TestValidator.equals(
    "initial todo completed_at should be null",
    initialTodo.completed_at,
    null,
  );

  // Step 3: Mark the todo as completed with a specific completion timestamp
  const completionTime = new Date().toISOString();
  const completedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        completed: true,
        completed_at: completionTime,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(completedTodo);

  // Step 4: Verify the todo is marked as completed with the correct timestamp
  TestValidator.equals(
    "todo should be marked as completed",
    completedTodo.completed,
    true,
  );
  TestValidator.equals(
    "todo completed_at should match the set timestamp",
    completedTodo.completed_at,
    completionTime,
  );
  TestValidator.equals(
    "todo id should remain the same",
    completedTodo.id,
    initialTodo.id,
  );

  // Step 5: Mark the todo as incomplete by clearing the completed flag and timestamp
  const incompleteTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: completedTodo.id,
      body: {
        completed: false,
        completed_at: null,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(incompleteTodo);

  // Step 6: Verify the todo is marked as incomplete with null timestamp
  TestValidator.equals(
    "todo should be marked as incomplete",
    incompleteTodo.completed,
    false,
  );
  TestValidator.equals(
    "todo completed_at should be null after marking incomplete",
    incompleteTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "todo id should remain the same",
    incompleteTodo.id,
    initialTodo.id,
  );
}
