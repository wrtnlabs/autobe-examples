import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCompletionRateStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletionRateStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task completion rate calculation for authenticated user with basic task
 * scenario.
 *
 * This test validates the task completion rate statistics API by creating a
 * comprehensive test dataset with mixed task states and verifying the
 * mathematical accuracy of the completion percentage calculation. The test
 * demonstrates:
 *
 * 1. User account creation and authentication setup
 * 2. Task creation with varied statuses (pending, completed, in-progress)
 * 3. Manual completion rate calculation using the formula: (Completed ÷ Total) ×
 *    100
 * 4. API response validation against manually calculated results
 * 5. Data integrity verification across all statistics fields
 * 6. Edge case testing with different task combinations
 *
 * The completion rate is core to todo application analytics, providing users
 * with productivity insights and personal task management effectiveness
 * metrics.
 */
export async function test_api_user_completion_rate_basic_calculation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      ip: "127.0.0.1",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create tasks with different statuses
  const tasks: ITodoAppTask[] = [];

  // Create pending tasks
  const pendingTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Review project documentation",
        description: "Complete detailed review of all project docs",
        priority: "High",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask1);
  tasks.push(pendingTask1);

  const pendingTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Prepare weekly report",
        description: "Compile and format weekly progress report",
        priority: "Medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask2);
  tasks.push(pendingTask2);

  // Create in-progress task
  const inProgressTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Implement user authentication",
        description: "Build login and registration functionality",
        priority: "High",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(inProgressTask);

  // Update task to in-progress status
  const updatedInProgressTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: inProgressTask.id,
      body: {
        status: "in-progress",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedInProgressTask);
  tasks.push(updatedInProgressTask);

  // Create completed tasks
  const completedTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Setup development environment",
        description: "Install and configure all required tools",
        priority: "High",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask1);

  // Mark as completed
  const finalCompletedTask1 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: completedTask1.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(finalCompletedTask1);
  tasks.push(finalCompletedTask1);

  const completedTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Write unit tests",
        description: "Create comprehensive test coverage",
        priority: "Medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask2);

  // Mark as completed
  const finalCompletedTask2 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: completedTask2.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(finalCompletedTask2);
  tasks.push(finalCompletedTask2);

  const completedTask3 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Code review completed",
        description: "Review team member's code changes",
        priority: "Low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask3);

  // Mark as completed
  const finalCompletedTask3 = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: completedTask3.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(finalCompletedTask3);
  tasks.push(finalCompletedTask3);

  // Step 3: Manually calculate expected completion rate
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const expectedCompletionRate = Math.round(
    (completedTasks / totalTasks) * 100,
  );

  // Step 4: Fetch completion rate statistics from API
  const statistics =
    await api.functional.todoApp.user.statistics.completion_rate.at(connection);
  typia.assert(statistics);

  // Step 5: Validate API results against manual calculation
  TestValidator.equals(
    "total tasks count matches",
    statistics.total_tasks,
    totalTasks,
  );
  TestValidator.equals(
    "completed tasks count matches",
    statistics.completed_tasks,
    completedTasks,
  );
  TestValidator.equals(
    "incomplete tasks count",
    statistics.incomplete_tasks,
    totalTasks - completedTasks,
  );
  TestValidator.equals(
    "completion rate percentage",
    statistics.completion_rate_percent,
    expectedCompletionRate,
  );

  // Step 6: Validate completion rate range
  TestValidator.predicate(
    "completion rate is valid percentage",
    statistics.completion_rate_percent >= 0 &&
      statistics.completion_rate_percent <= 100,
  );

  // Step 7: Test edge case - create additional tasks to change the rate
  const additionalCompletedTask =
    await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "Deploy to staging",
        description: "Deploy application to staging environment",
        priority: "High",
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(additionalCompletedTask);

  // Mark as completed
  await api.functional.todoApp.user.tasks.update(connection, {
    taskId: additionalCompletedTask.id,
    body: {
      status: "completed",
    } satisfies ITodoAppTask.IUpdate,
  });

  // Fetch updated statistics
  const updatedStatistics =
    await api.functional.todoApp.user.statistics.completion_rate.at(connection);
  typia.assert(updatedStatistics);

  // Validate updated calculations
  const newExpectedRate = Math.round(
    ((completedTasks + 1) / (totalTasks + 1)) * 100,
  );
  TestValidator.equals(
    "updated completion rate matches",
    updatedStatistics.completion_rate_percent,
    newExpectedRate,
  );
  TestValidator.equals(
    "updated total tasks",
    updatedStatistics.total_tasks,
    totalTasks + 1,
  );
  TestValidator.equals(
    "updated completed tasks",
    updatedStatistics.completed_tasks,
    completedTasks + 1,
  );

  // Step 8: Final data integrity validation
  TestValidator.predicate(
    "completion calculations are consistent",
    updatedStatistics.total_tasks ===
      updatedStatistics.completed_tasks + updatedStatistics.incomplete_tasks,
  );
}
