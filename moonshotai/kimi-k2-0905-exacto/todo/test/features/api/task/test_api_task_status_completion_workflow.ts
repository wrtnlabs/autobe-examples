import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task completion workflow that validates status transition from pending
 * to completed.
 *
 * This comprehensive test exercises the complete task lifecycle:
 *
 * 1. Creates a new user account with proper authentication
 * 2. Creates a fresh todo task with pending status
 * 3. Transitions the task from pending to completed status
 * 4. Validates automatic completion timestamp generation
 * 5. Verifies task metadata updates correctly
 *
 * The test ensures proper task ownership validation and status transition
 * handling while maintaining data integrity through the completion process.
 */
export async function test_api_task_status_completion_workflow(
  connection: api.IConnection,
) {
  // Create a new user account for authenticated operations
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com/todo-app",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create initial task with pending status
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1); // Tomorrow

  const pendingTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        status: "pending",
        priority: RandomGenerator.pick([
          "none",
          "low",
          "medium",
          "high",
        ] as const),
        due_date: dueDate.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask);

  // Verify task is initially created with pending status
  TestValidator.equals(
    "task status should be pending initially",
    pendingTask.status,
    "pending",
  );
  TestValidator.predicate(
    "completed_at should be null for pending tasks",
    pendingTask.completed_at === null && pendingTask.completed_at !== undefined,
  );

  // Update the task to completed status
  const completedTask = await api.functional.todoApp.user.users.tasks.update(
    connection,
    {
      userId: user.id,
      taskId: pendingTask.id,
      body: { status: "completed" } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(completedTask);

  // Validate status transition
  TestValidator.equals(
    "task status should be completed after update",
    completedTask.status,
    "completed",
  );

  // Validate auto-generation of completion timestamp
  TestValidator.predicate(
    "completed_at should not be null after completion",
    completedTask.completed_at !== null &&
      completedTask.completed_at !== undefined,
  );

  // Validate the completion timestamp format and recency
  const completionDate = new Date(
    typia.assert<string>(completedTask.completed_at),
  );
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  TestValidator.predicate(
    "completion timestamp should be valid ISO format",
    !isNaN(completionDate.getTime()),
  );
  TestValidator.predicate(
    "completion timestamp should be recent (within last minute)",
    completionDate >= oneMinuteAgo,
  );
  TestValidator.predicate(
    "completion timestamp should not be in the future",
    completionDate <= now,
  );

  // Validate task metadata is preserved
  TestValidator.equals(
    "task ID should remain the same",
    completedTask.id,
    pendingTask.id,
  );
  TestValidator.equals(
    "task title should remain unchanged",
    completedTask.title,
    pendingTask.title,
  );
  TestValidator.equals(
    "task description should remain unchanged",
    completedTask.description,
    pendingTask.description,
  );
  TestValidator.equals(
    "task priority should remain unchanged",
    completedTask.priority,
    pendingTask.priority,
  );
  TestValidator.equals(
    "task due_date should remain unchanged",
    completedTask.due_date,
    pendingTask.due_date,
  );
  TestValidator.equals(
    "user assignment should remain unchanged",
    completedTask.user.id,
    pendingTask.user.id,
  );

  // Validate timestamp progression
  TestValidator.predicate(
    "updated_at should be more recent than created_at after completion update",
    new Date(completedTask.updated_at).getTime() >=
      new Date(pendingTask.created_at).getTime(),
  );
}
