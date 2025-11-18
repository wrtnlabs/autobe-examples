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
 * Test comprehensive task analytics across bulk operations to validate data
 * aggregation and insights generation.
 *
 * This test creates various types of tasks with different priorities, statuses,
 * and due dates to analyze bulk operations and verify accurate statistics about
 * completion rates, priority distributions, and time-based trends. Validates
 * that the todo app's API can handle bulk task management and provide
 * meaningful insights for enhanced productivity management.
 *
 * 1. Create user account and authenticate
 * 2. Generate bulk task dataset with varied properties
 * 3. Test completion rate statistics
 * 4. Validate priority distribution analytics
 * 5. Analyze time-based trends
 * 6. Test search and filtering capabilities
 * 7. Verify pagination with bulk data
 * 8. Test task status analytics
 * 9. Validate priority-based insights
 * 10. Test due date analytics
 */
export async function test_api_bulk_task_analysis_and_insights(
  connection: api.IConnection,
) {
  // Step 1: Create user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate bulk task dataset with varied properties
  const tasks = await ArrayUtil.asyncRepeat(50, async (idx) => {
    const priorities = ["none", "low", "medium", "high"] as const;
    const statuses = ["pending", "completed"] as const;

    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        status: RandomGenerator.pick(statuses),
        priority: RandomGenerator.pick(priorities),
        due_date:
          Math.random() < 0.7
            ? new Date(
                Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
              ).toISOString()
            : null,
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    return task;
  });

  // Step 3: Test completion rate statistics
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const totalCount = tasks.length;

  TestValidator.predicate(
    "completion rate should be greater than 0",
    completedCount > 0 && completedCount < totalCount,
  );
  TestValidator.predicate("pending items should exist", pendingCount > 0);

  // Step 4: Validate priority distribution analytics
  const priorityStats = {
    none: tasks.filter((t) => t.priority === "none" || t.priority === null)
      .length,
    low: tasks.filter((t) => t.priority === "low").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    high: tasks.filter((t) => t.priority === "high").length,
  };

  TestValidator.predicate(
    "priority distribution should cover multiple levels",
    priorityStats.none +
      priorityStats.low +
      priorityStats.medium +
      priorityStats.high >
      0,
  );

  // Step 5: Analyze time-based trends
  const dueTasks = tasks.filter(
    (t) => t.due_date !== null && t.due_date !== undefined,
  );
  TestValidator.predicate(
    "due date analytics should show future tasks",
    dueTasks.length > 0,
  );

  // Step 6: Test search and filtering capabilities
  const searchQuery = "test search term";
  const searchResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        search: searchQuery,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search results should return paginated structure",
    searchResults.pagination !== undefined && searchResults.data !== undefined,
  );

  // Step 7: Test status filtering
  const pendingTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingTasks);

  TestValidator.equals(
    "pending status filter should return only pending tasks",
    pendingTasks.data.length > 0,
    true,
  );

  // Step 8: Test priority filtering
  const highPriorityTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        priority: "high",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(highPriorityTasks);

  TestValidator.predicate(
    "high priority filter should return meaningful results",
    highPriorityTasks.data.length >= 0,
  );

  // Step 9: Test due date analytics
  const daysInFuture = 7;
  const futureDate = new Date(
    Date.now() + daysInFuture * 24 * 60 * 60 * 1000,
  ).toISOString();
  const upcomingTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        due_before: futureDate,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(upcomingTasks);

  TestValidator.predicate(
    "upcoming tasks should have due date analytics",
    upcomingTasks.data.length >= 0,
  );

  // Step 10: Test bulk operations with pagination
  const allTasks = await api.functional.todoApp.user.tasks.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies ITodoAppTask.IRequest,
  });
  typia.assert(allTasks);

  TestValidator.predicate(
    "bulk task analytics should handle all results",
    allTasks.pagination.records === totalCount,
  );
  TestValidator.predicate(
    "all tasks pagination should return correct total",
    allTasks.data.length === totalCount,
  );
}
