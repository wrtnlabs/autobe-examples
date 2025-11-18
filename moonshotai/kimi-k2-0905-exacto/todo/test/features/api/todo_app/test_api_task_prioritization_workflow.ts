import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task creation with varied priority levels to validate the app's
 * prioritization capabilities. Creates tasks across all priority levels from
 * none to high to test comprehensive priority management. Validates that users
 * can effectively organize work by urgency and importance using the app's
 * priority system.
 *
 * Test workflow:
 *
 * 1. Create a new user account for testing
 * 2. Create tasks with different priority levels (none, low, medium, high)
 * 3. Verify that each task maintains its correct priority assignment
 * 4. Use the task listing endpoint to filter and verify priority-based queries
 * 5. Ensure the priority system works correctly for all supported levels
 */
export async function test_api_task_prioritization_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com/todo-app",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create tasks with different priority levels
  const priorityLevels = ["none", "low", "medium", "high"] as const;
  const tasks: ITodoAppTask[] = [];

  // Create one task for each priority level
  for (const priority of priorityLevels) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Test task with ${priority} priority`,
        description: `This task has ${priority} priority level for validation testing`,
        status: "pending",
        priority: priority,
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    tasks.push(task);
  }

  // Step 3: Verify created tasks have correct priority assignments
  TestValidator.equals(
    "priority level count should match",
    tasks.length,
    priorityLevels.length,
  );

  for (let i = 0; i < tasks.length; i++) {
    TestValidator.equals(
      `task ${i + 1} has expected priority`,
      tasks[i].priority,
      priorityLevels[i],
    );
    TestValidator.equals(
      `task ${i + 1} has correct status`,
      tasks[i].status,
      "pending",
    );
  }

  // Step 4: Test task listing with priority filtering
  const allTasksResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        priority: undefined,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(allTasksResponse);

  // Verify at least our created tasks are returned
  TestValidator.predicate(
    "task count is reasonable",
    allTasksResponse.data.length >= priorityLevels.length,
  );

  // Test filtering by each priority level
  for (const priority of priorityLevels) {
    const filteredResponse = await api.functional.todoApp.user.tasks.index(
      connection,
      {
        body: {
          priority: priority,
        } satisfies ITodoAppTask.IRequest,
      },
    );
    typia.assert(filteredResponse);

    // Verify all tasks in filtered response have the requested priority
    TestValidator.predicate(
      `filtered tasks have ${priority} priority`,
      filteredResponse.data.every((task) => task.priority === priority),
    );

    // Verify we have at least one task for the requested priority
    TestValidator.predicate(
      `has tasks with ${priority} priority`,
      filteredResponse.data.length >= 1,
    );
  }

  // Step 5: Verify task page summary includes priority information
  const summaryResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        limit: 10,
        order_by: "priority",
        order_direction: "asc",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(summaryResponse);

  // Verify pagination structure
  TestValidator.predicate(
    "pagination is valid",
    summaryResponse.pagination.limit <= 10,
  );
  TestValidator.equals(
    "pagination limit matches request",
    summaryResponse.pagination.limit,
    Math.min(summaryResponse.data.length, 10),
  );
}
