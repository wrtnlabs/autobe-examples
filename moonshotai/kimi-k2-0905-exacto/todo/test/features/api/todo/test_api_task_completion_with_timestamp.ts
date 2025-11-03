import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test updating task completion status from pending to completed, validating
 * that the system automatically sets the completed_at timestamp when a task is
 * marked as completed. This ensures proper workflow tracking and timestamp
 * management for task completion.
 *
 * 1. Create a new user account through the authentication system
 * 2. Create a pending task using the task creation API with an initial description
 * 3. Verify the task is in pending state with no completed_at timestamp
 * 4. Update the task to mark it as completed
 * 5. Validate that the completed_at timestamp is automatically set when the task
 *    transitions to completed state
 * 6. Verify all task properties match the expected state after completion
 */
export async function test_api_task_completion_with_timestamp(
  connection: api.IConnection,
) {
  // Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Create a new task in pending status
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createTaskBody = {
    description: taskDescription,
    business_status: "pending",
    href: "https://example.com/tasks",
    referrer: "https://example.com/dashboard",
  } satisfies ITodoTask.ICreate;

  const createdTask = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: createTaskBody,
    },
  );
  typia.assert(createdTask);

  // Verify initial task state - pending and not completed
  TestValidator.equals(
    "task initial completion status",
    createdTask.completed,
    false,
  );
  TestValidator.equals(
    "task initial business status",
    createdTask.business_status,
    "pending",
  );
  TestValidator.equals(
    "task initial completed_at",
    createdTask.completed_at,
    null,
  );

  // Update the task to mark it as completed
  const updateTaskBody = {
    completed: true,
  } satisfies ITodoTask.IUpdate;

  const updatedTask = await api.functional.todo.user.user_tasks.update(
    connection,
    {
      id: createdTask.id,
      body: updateTaskBody,
    },
  );
  typia.assert(updatedTask);

  // Validate the task is now completed
  TestValidator.equals(
    "task updated completion status",
    updatedTask.completed,
    true,
  );
  TestValidator.predicate(
    "task completed_at timestamp is set",
    updatedTask.completed_at !== null && updatedTask.completed_at !== undefined,
  );

  // Verify timestamps are properly managed - completed_at should be after created_at
  TestValidator.predicate(
    "created_at is before completed_at",
    updatedTask.created_at <= updatedTask.completed_at!,
  );

  // Verify other properties remain unchanged
  TestValidator.equals("task id unchanged", updatedTask.id, createdTask.id);
  TestValidator.equals(
    "task description unchanged",
    updatedTask.description,
    createdTask.description,
  );
  TestValidator.equals(
    "task user unchanged",
    updatedTask.user.id,
    createdTask.user.id,
  );
}
