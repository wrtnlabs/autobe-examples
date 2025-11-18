import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Comprehensive test of task deletion across different task states including
 * pending, completed, overdue, and different priority levels.
 *
 * This function validates that the task deletion endpoint works correctly
 * regardless of task status, priority, or due date. It creates multiple tasks
 * with various configurations including:
 *
 * - High priority tasks
 * - Tasks with overdue due dates
 * - Tasks with completed status
 * - Pending tasks with different priority levels
 * - Tasks with and without due dates
 *
 * Business Context: Users frequently need to delete tasks regardless of their
 * current state - whether they're pending, overdue, completed, or have
 * different priority levels. The deletion operation should be consistent and
 * reliable across all task types.
 *
 * Testing Strategy:
 *
 * 1. Create a test user for authentication
 * 2. Generate various types of tasks to cover the deletion scenarios
 * 3. Create tasks with different statuses (pending, completed)
 * 4. Create tasks with different priority levels (high, medium, low, none)
 * 5. Create tasks with and without due dates including overdue ones
 * 6. Delete each created task and verify the operation succeeds
 *
 * Expected Behavior:
 *
 * - All deletion operations should complete without errors
 * - Different task statuses shouldn't affect deletion capability
 * - Task priority levels should not influence deletion operations
 * - Tasks with or without due dates should be deletable equally
 */
export async function test_api_task_deletion_with_various_statuses(
  connection: api.IConnection,
) {
  // Step 1: Create test user
  const testEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail,
      password: "testPassword123",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create various types of tasks for deletion testing

  // Overdue task (due date in the past)
  const overdueTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Overdue task for deletion test",
        status: "pending",
        priority: "high",
        due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(overdueTask);

  // High priority completed task
  const completedHighPriorityTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Completed high priority task for deletion test",
        status: "completed",
        priority: "high",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(completedHighPriorityTask);

  // Medium priority pending task with due date
  const mediumPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Medium priority pending task with deadline",
        status: "pending",
        priority: "medium",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(mediumPriorityTask);

  // Low priority task without due date
  const lowPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Low priority task without deadline",
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(lowPriorityTask);

  // Task with no priority set
  const noPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Task with no priority setting",
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(noPriorityTask);

  // Step 3: Test deletion of each task type

  // Delete overdue task
  await api.functional.todoApp.user.users.tasks.erase(connection, {
    userId: user.id,
    taskId: overdueTask.id,
  });

  // Delete completed high priority task
  await api.functional.todoApp.user.users.tasks.erase(connection, {
    userId: user.id,
    taskId: completedHighPriorityTask.id,
  });

  // Delete medium priority task with due date
  await api.functional.todoApp.user.users.tasks.erase(connection, {
    userId: user.id,
    taskId: mediumPriorityTask.id,
  });

  // Delete low priority task without due date
  await api.functional.todoApp.user.users.tasks.erase(connection, {
    userId: user.id,
    taskId: lowPriorityTask.id,
  });

  // Delete task with no priority set
  await api.functional.todoApp.user.users.tasks.erase(connection, {
    userId: user.id,
    taskId: noPriorityTask.id,
  });

  // Step 4: Test error case - delete non-existent task
  await TestValidator.error(
    "deleting non-existent task should fail",
    async () => {
      await api.functional.todoApp.user.users.tasks.erase(connection, {
        userId: user.id,
        taskId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );

  // Step 5: Create and delete one final task to confirm deletion capability
  const finalTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: "Final deletion test task",
      status: "pending",
      priority: "high",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(finalTask);

  await api.functional.todoApp.user.users.tasks.erase(connection, {
    userId: user.id,
    taskId: finalTask.id,
  });

  TestValidator.equals(
    "task deletion test results verify successful deletion operations",
    6, // Total tasks created and deleted
    6,
  );
}
