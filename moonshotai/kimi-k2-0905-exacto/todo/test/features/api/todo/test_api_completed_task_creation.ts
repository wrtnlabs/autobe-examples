import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creation of tasks with 'completed' status to verify the system supports
 * immediate task completion scenarios. Validates that completed tasks receive
 * proper status assignment and completion timestamp generation. Ensures the
 * workflow properly handles archived task creation without requiring additional
 * status updates after creation.
 *
 * Test flow:
 *
 * 1. Create a new user account for authentication (dependency: /auth/user/join)
 * 2. Create a task with completed status to verify immediate completion support
 * 3. Validate that the task has proper status assignment (completed)
 * 4. Verify completion timestamp generation
 * 5. Test additional completed task scenario with due date and priority
 * 6. Ensure the workflow handles completed tasks without requiring additional
 *    updates
 */
export async function test_api_completed_task_creation(
  connection: api.IConnection,
) {
  // Step 1: Create user for task creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "1234",
      href: "https://example.com/test",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create completed task - basic scenario
  const completedTaskBasic =
    await api.functional.todoApp.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        title: "Completed Task - Basic",
        status: "completed",
        description: "This task is immediately marked as completed",
      } satisfies ITodoAppTask.ICreate,
    });

  // Step 3: Validate completed task properties
  TestValidator.equals(
    "task status is completed",
    completedTaskBasic.status,
    "completed",
  );
  TestValidator.predicate(
    "task has completion timestamp",
    completedTaskBasic.completed_at !== null,
  );
  TestValidator.equals(
    "task title matches",
    completedTaskBasic.title,
    "Completed Task - Basic",
  );
  TestValidator.equals(
    "task owner matches user",
    completedTaskBasic.user.id,
    user.id,
  );

  // Step 4: Verify task is properly typed
  typia.assert(completedTaskBasic);

  // Step 5: Create completed task with additional properties
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const completedTaskWithDetails =
    await api.functional.todoApp.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        title: "Completed Task with Details",
        status: "completed",
        description: "This completed task has due date and priority",
        due_date: futureDate,
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    });

  // Step 6: Validate completed task with details
  TestValidator.equals(
    "task with details status is completed",
    completedTaskWithDetails.status,
    "completed",
  );
  TestValidator.predicate(
    "task with details has completion timestamp",
    completedTaskWithDetails.completed_at !== null,
  );
  TestValidator.equals(
    "task with details title matches",
    completedTaskWithDetails.title,
    "Completed Task with Details",
  );
  TestValidator.equals(
    "task with details description matches",
    completedTaskWithDetails.description,
    "This completed task has due date and priority",
  );
  TestValidator.equals(
    "task with details due date matches",
    completedTaskWithDetails.due_date,
    futureDate,
  );
  TestValidator.equals(
    "task with details priority matches",
    completedTaskWithDetails.priority,
    "high",
  );

  // Step 7: Verify both tasks are properly typed
  typia.assert(completedTaskWithDetails);

  // Step 8: Test creating completed task without description (minimal case)
  const completedTaskMinimal =
    await api.functional.todoApp.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        title: "Completed Task - Minimal",
        status: "completed",
      } satisfies ITodoAppTask.ICreate,
    });

  // Step 9: Verify minimal completed task
  TestValidator.equals(
    "minimal task status is completed",
    completedTaskMinimal.status,
    "completed",
  );
  TestValidator.predicate(
    "minimal task has completion timestamp",
    completedTaskMinimal.completed_at !== null,
  );
  TestValidator.equals(
    "minimal task title matches",
    completedTaskMinimal.title,
    "Completed Task - Minimal",
  );

  // Final validation
  typia.assert(completedTaskMinimal);
}
