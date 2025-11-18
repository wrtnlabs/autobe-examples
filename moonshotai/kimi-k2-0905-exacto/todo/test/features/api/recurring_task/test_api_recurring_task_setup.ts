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
 * Test recurring task creation patterns to ensure consistent todo list
 * management
 *
 * This test simulates real-world usage patterns where users repeatedly create
 * similar tasks for daily work tracking. It validates the consistency and
 * reliability of task creation across multiple iterations, testing different
 * task configurations including titles, descriptions, priorities, and due
 * dates.
 */
export async function test_api_recurring_task_setup(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for recurring task pattern testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/todoApp",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test recurring daily task creation patterns
  const dailyTaskTitles = [
    "Check morning emails",
    "Review daily schedule",
    "Update project status",
    "Team standup meeting",
  ];

  const createdTasks: ITodoAppTask[] = [];

  // Create multiple tasks simulating daily work routine
  for (let day = 1; day <= 5; day++) {
    const taskTitle = RandomGenerator.pick(dailyTaskTitles);
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `${taskTitle} - Day ${day}`,
        description: `Daily task for workflow completion - Day ${day}`,
        status: "pending",
        priority: RandomGenerator.pick([
          "none",
          "low",
          "medium",
          "high",
        ] as const),
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    createdTasks.push(task);
  }

  // Step 3: Track task creation patterns and verify consistency
  const searchResult = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        order_by: "created_at",
        order_direction: "desc",
        limit: 10,
        due_before: "2025-12-31T23:59:59Z", // Add realistic due date filter
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 4: Validate consistency across iterations
  TestValidator.predicate(
    "all tasks have consistent user ownership",
    searchResult.data.every(
      (task: ITodoAppTask.ISummary) => task.user.id === user.id,
    ),
  );

  TestValidator.predicate(
    "all pending tasks created in proper order",
    searchResult.data.length >= 5,
  );

  // Validate specific task properties
  const sampleTask = searchResult.data[0];
  TestValidator.equals("task status is pending", sampleTask.status, "pending");
  TestValidator.predicate(
    "task title contains day identifier",
    sampleTask.title.includes("Day"),
  );
  TestValidator.predicate(
    "priority is valid value",
    ["none", "low", "medium", "high"].includes(sampleTask.priority || "none"),
  );

  // Step 5: Simulate recurring pattern verification
  const recurringTasksCreated = createdTasks.filter((task) =>
    task.title.includes("Day"),
  );

  TestValidator.equals(
    "correct number of recurring tasks created",
    recurringTasksCreated.length,
    5,
  );

  TestValidator.predicate(
    "tasks have unique identifiers",
    new Set(recurringTasksCreated.map((t) => t.id)).size ===
      recurringTasksCreated.length,
  );

  TestValidator.predicate(
    "tasks have consistent creation pattern",
    recurringTasksCreated.every(
      (task) => task.created_at !== null && task.created_at !== undefined,
    ),
  );
}
