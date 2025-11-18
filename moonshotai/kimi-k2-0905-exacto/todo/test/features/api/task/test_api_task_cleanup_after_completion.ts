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
 * Test efficient task cleanup patterns where users delete completed tasks to
 * maintain organized todo lists. Validates that users can effectively manage
 * task overflow by removing finished items while maintaining active tasks.
 * Simulates natural productivity habits of cleaning up completed work to
 * maintain focus on pending tasks.
 */
export async function test_api_task_cleanup_after_completion(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      name: RandomGenerator.name(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com/landing",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple tasks with different statuses
  const pendingTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Review project documentation",
        description: "Go through the latest project specs and requirements",
        status: "pending",
        priority: "high",
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask1);

  const pendingTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Schedule team meeting",
        description: "Coordinate with team members for next week",
        status: "pending",
        priority: "medium",
        due_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask2);

  const completedTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Update project timeline",
        description: "Completed the timeline adjustment for Q4 deliverables",
        status: "completed",
        priority: "medium",
        due_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask1);

  const completedTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Send status report",
        description: "Emailed weekly status update to stakeholders",
        status: "completed",
        priority: "low",
        due_date: new Date(Date.now() - 172800000).toISOString(), // Two days ago
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask2);

  const pendingTask3 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Prepare presentation slides",
        description: "Create slides for the upcoming client presentation",
        status: "pending",
        priority: "high",
        due_date: new Date(Date.now() + 259200000).toISOString(), // Three days from now
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask3);

  // Step 3: Verify initial task setup
  const allTasksResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(allTasksResponse);

  TestValidator.equals(
    "total initial tasks",
    allTasksResponse.pagination.records,
    5,
  );

  // Verify pending tasks exist
  const pendingTasksResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingTasksResponse);

  TestValidator.equals(
    "pending tasks count",
    pendingTasksResponse.pagination.records,
    3,
  );

  // Verify completed tasks exist
  const completedTasksResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "completed",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(completedTasksResponse);

  TestValidator.equals(
    "completed tasks count",
    completedTasksResponse.pagination.records,
    2,
  );

  // Step 4: Delete completed tasks to clean up
  const deletedTask1 = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: completedTask1.id,
    },
  );
  typia.assert(deletedTask1);

  TestValidator.equals(
    "deleted task title matches",
    deletedTask1.title,
    completedTask1.title,
  );

  const deletedTask2 = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: completedTask2.id,
    },
  );
  typia.assert(deletedTask2);

  TestValidator.equals(
    "deleted task title matches",
    deletedTask2.title,
    completedTask2.title,
  );

  // Step 5: Verify cleanup operation
  const afterCleanupResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(afterCleanupResponse);

  TestValidator.equals(
    "tasks after cleanup",
    afterCleanupResponse.pagination.records,
    3,
  );

  // Verify only pending tasks remain
  const remainingPending = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(remainingPending);

  TestValidator.equals(
    "all remaining are pending",
    remainingPending.pagination.records,
    3,
  );

  // Verify no completed tasks remain
  const remainingCompleted = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "completed",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(remainingCompleted);

  TestValidator.equals(
    "no completed tasks remain",
    remainingCompleted.pagination.records,
    0,
  );

  // Step 6: Verify deleted tasks are no longer accessible
  await TestValidator.error("cannot delete already deleted task", async () => {
    await api.functional.todoApp.user.tasks.erase(connection, {
      taskId: completedTask1.id,
    });
  });

  // Verify pending tasks are unaffected by cleanup
  const pendingTaskIds = remainingPending.data.map((task) => task.id);
  const originalPendingIds = [
    pendingTask1.id,
    pendingTask2.id,
    pendingTask3.id,
  ];

  TestValidator.equals(
    "pending tasks preserved",
    pendingTaskIds,
    originalPendingIds,
  );
}
