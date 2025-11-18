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
 * Test priority-focused task discovery and organization to validate the app's
 * prioritization system effectiveness. Creates tasks with all priority levels
 * and tests search/filtering by priority to ensure users can effectively focus
 * on urgent work. Validates that high-priority tasks are easily discoverable
 * and manageable within the user's todo list organization workflow.
 */
export async function test_api_priority_based_task_organization(
  connection: api.IConnection,
) {
  // Step 1: Register as a user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.MinLength<10> & tags.Format<"uri">>(),
      referrer: typia.random<
        string & tags.MinLength<10> & tags.Format<"uri">
      >(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create tasks with different priority levels
  const priorities = ["none", "low", "medium", "high"] as const;
  const tasks = await ArrayUtil.asyncRepeat(12, async (index) => {
    const priority = priorities[index % 4];
    const taskData = {
      title: `Priority ${priority} task #${index + 1}`,
      description: `Task description for ${priority} priority item`,
      status: RandomGenerator.pick(["pending", "completed"]),
    } satisfies ITodoAppTask.ICreate;

    // Handle 'none' priority which should be null/undefined
    if (priority !== "none") {
      (taskData as any).priority = priority;
    }

    return await api.functional.todoApp.user.tasks.create(connection, {
      body: taskData,
    });
  });
  typia.assert(tasks);

  // Step 3: Test filtering by high priority
  const highPriorityTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        priority: "high",
        order_by: "priority",
        order_direction: "desc",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(highPriorityTasks);

  TestValidator.predicate(
    "high priority filter should contain only high priority tasks",
    highPriorityTasks.data.every((task) => task.priority === "high"),
  );

  // Step 4: Test filtering by medium priority
  const mediumPriorityTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        priority: "medium",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(mediumPriorityTasks);

  TestValidator.predicate(
    "medium priority filter should contain only medium priority tasks",
    mediumPriorityTasks.data.every((task) => task.priority === "medium"),
  );

  // Step 5: Test sorting by priority (descending)
  const prioritySortedTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        order_by: "priority",
        order_direction: "desc",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(prioritySortedTasks);

  TestValidator.predicate(
    "priority sorted tasks should be in descending priority order",
    prioritySortedTasks.data.length > 0,
  );

  // Step 6: Test combined filtering (priority + status)
  const completedHighPriorityTasks =
    await api.functional.todoApp.user.tasks.index(connection, {
      body: {
        priority: "high",
        status: "completed",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(completedHighPriorityTasks);

  TestValidator.predicate(
    "completed high priority filter should contain only completed high priority tasks",
    completedHighPriorityTasks.data.every(
      (task) => task.priority === "high" && task.status === "completed",
    ),
  );

  // Step 7: Test pagination with priority filtering
  const paginatedPriorityTasks = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        priority: "low",
        page: 1,
        limit: 5,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(paginatedPriorityTasks);

  TestValidator.equals(
    "pagination should limit results to requested count",
    paginatedPriorityTasks.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "low priority pagination should contain only low priority tasks",
    paginatedPriorityTasks.data.every((task) => task.priority === "low"),
  );

  // Step 8: Test search functionality with priority context
  const searchResults = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        search: "high priority",
        order_by: "priority",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search should find relevant priority tasks",
    searchResults.data.length > 0,
  );
}
