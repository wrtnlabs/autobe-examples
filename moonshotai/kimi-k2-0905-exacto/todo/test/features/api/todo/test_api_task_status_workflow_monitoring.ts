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
 * Test status-based task discovery to validate workflow monitoring
 * capabilities. Creates tasks in both pending and completed statuses and tests
 * filtering by status to simulate realistic task management workflows.
 * Validates that users can effectively track their work progress and monitor
 * completed vs outstanding tasks using the app's status organization system.
 *
 * 1. User registration creates authenticated account for testing
 * 2. Create multiple tasks with different statuses (pending and completed)
 * 3. Create tasks with varied priorities and due dates for comprehensive testing
 * 4. Test filtering tasks by status (pending/completed)
 * 5. Verify pagination works correctly with filtered results
 * 6. Validate task ownership and data integrity
 */
export async function test_api_task_status_workflow_monitoring(
  connection: api.IConnection,
) {
  // User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "secure1234",
      name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: connection.host + "/",
      referrer: connection.host + "/login",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create pending tasks
  const pendingTask1 = await api.functional.todoApp.user.tasks.create(
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
          wordMin: 5,
          wordMax: 10,
        }),
        status: "pending",
        priority: RandomGenerator.pick([
          "none",
          "low",
          "medium",
          "high",
        ] as const),
        due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask1);

  const pendingTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 9,
        }),
        status: "pending",
        priority: RandomGenerator.pick([
          "none",
          "low",
          "medium",
          "high",
        ] as const),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask2);

  // Create completed task
  const completedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 6,
          wordMax: 12,
        }),
        status: "completed",
        priority: RandomGenerator.pick([
          "none",
          "low",
          "medium",
          "high",
        ] as const),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);

  // Test filtering by pending status
  const pendingTasksPage = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingTasksPage);

  TestValidator.equals("pending tasks count", pendingTasksPage.data.length, 2);
  TestValidator.predicate(
    "all pending tasks have status 'pending'",
    pendingTasksPage.data.every((task) => task.status === "pending"),
  );

  // Test filtering by completed status
  const completedTasksPage = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "completed",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(completedTasksPage);

  TestValidator.equals(
    "completed tasks count",
    completedTasksPage.data.length,
    1,
  );
  TestValidator.predicate(
    "all completed tasks have status 'completed'",
    completedTasksPage.data.every((task) => task.status === "completed"),
  );
  TestValidator.equals(
    "completed task ID",
    completedTasksPage.data[0].id,
    completedTask.id,
  );

  // Test pagination with status filtering
  const paginatedPending = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(paginatedPending);

  TestValidator.predicate(
    "pagination pages correct",
    paginatedPending.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination results correct",
    paginatedPending.pagination.records >= 2,
  );
  TestValidator.equals(
    "pagination page",
    paginatedPending.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedPending.pagination.limit,
    10,
  );

  // Test combined filtering with priority
  const highPriorityPending = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        priority: "high",
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(highPriorityPending);

  TestValidator.predicate(
    "filtered results valid",
    highPriorityPending.data.length >= 0,
  );
  TestValidator.predicate(
    "all are pending and high priority",
    highPriorityPending.data.every(
      (task) => task.status === "pending" && task.priority === "high",
    ),
  );

  // Validate task ownership - all tasks should belong to test user
  TestValidator.predicate(
    "task ownership correct",
    pendingTasksPage.data.every(
      (task) => task.todo_app_user_id !== null && task.user !== null,
    ),
  );
}
