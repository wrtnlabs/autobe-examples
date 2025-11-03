import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppUserMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserMetrics";

/*
 * Validate admin view of aggregated user metrics for a TodoApp user.
 *
 * Business flow executed in this test:
 * 1. Create an admin account (join) using a cloned connection (adminConn).
 * 2. Create a todoUser account (join) using a cloned connection (userConn).
 * 3. Create a todo list for the todoUser.
 * 4. Create three tasks: completed, overdue, and pending.
 * 5. Retrieve aggregated metrics as admin and validate counts and computed fields.
 * 6. Validate negative/edge cases: unauthorized access, invalid UUID format, and non-existent user.
 *
 * Implementation notes:
 * - Use separate connection clones to simulate different authenticated actors
 *   (adminConn and userConn). Do NOT mutate the original `connection.headers`.
 * - Use typia.assert() on all non-void API responses to perform schema validation.
 * - Use TestValidator for all business assertions. Titles are descriptive and
 *   provided as the first parameter per TestValidator contract.
 * - This test uses unique emails and timestamps to avoid cross-test pollution.
 */
export async function test_api_todo_user_metrics_admin_view(
  connection: api.IConnection,
) {
  // 0. Prepare isolated connection clones for admin and todoUser
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };

  // 1. Admin join (register)
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    adminConn,
    {
      body: {
        email: adminEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/app",
        referrer: "https://example.com/",
        role: "superadmin",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. TodoUser join (register)
  const userEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(userConn, {
      body: {
        email: userEmail,
        password: "Userpass123!",
        href: "https://example.com/app",
        referrer: "https://example.com/",
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(todoUser);

  // 3. Create a list for the todoUser
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    userConn,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // 4. Create three tasks: completed, overdue, pending
  const now = new Date();
  const pastIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const futureIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Task A: completed
  const taskA: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(userConn, {
      listId: list.id,
      body: {
        title: "Completed task",
        description: "This task is completed",
        isCompleted: true,
        dueDate: pastIso,
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(taskA);

  // Task B: overdue (not completed, dueDate in past)
  const taskB: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(userConn, {
      listId: list.id,
      body: {
        title: "Overdue task",
        description: "This task is overdue",
        isCompleted: false,
        dueDate: pastIso,
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(taskB);

  // Task C: pending (not completed, dueDate in future)
  const taskC: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(userConn, {
      listId: list.id,
      body: {
        title: "Pending task",
        description: "This task is pending",
        isCompleted: false,
        dueDate: futureIso,
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(taskC);

  // 5. Admin retrieves metrics for the todoUser
  const metrics: ITodoAppUserMetrics =
    await api.functional.todoApp.admin.todoUsers.metrics(adminConn, {
      todoUserId: todoUser.id,
    });
  typia.assert(metrics);

  // Business assertions
  TestValidator.equals(
    "total tasks equals created tasks",
    metrics.totalTasks,
    3,
  );
  TestValidator.equals(
    "completed tasks count equals number of completed tasks",
    metrics.completedTasksCount,
    1,
  );
  TestValidator.equals(
    "overdue tasks count equals number of overdue tasks",
    metrics.overdueTasksCount,
    1,
  );
  TestValidator.equals(
    "active lists count equals created lists",
    metrics.activeListsCount,
    1,
  );

  // completionRate should be between 0 and 1 (synchronous predicate)
  TestValidator.predicate(
    "completion rate is within [0,1]",
    metrics.completionRate >= 0 && metrics.completionRate <= 1,
  );

  // averageTimeToCompleteSeconds should be a number when at least one completed task exists
  TestValidator.predicate(
    "averageTimeToCompleteSeconds is number or null",
    metrics.averageTimeToCompleteSeconds === null ||
      typeof metrics.averageTimeToCompleteSeconds === "number",
  );

  // lastActiveAt may be null or ISO datetime string; typia.assert already validated format when present
  TestValidator.predicate(
    "lastActiveAt is present or null",
    metrics.lastActiveAt === null || typeof metrics.lastActiveAt === "string",
  );

  // 6. Negative / edge checks
  // 6.1 Unauthorized access: todoUser token should not be allowed to call admin endpoint
  await TestValidator.error(
    "todoUser token cannot access admin metrics",
    async () => {
      await api.functional.todoApp.admin.todoUsers.metrics(userConn, {
        todoUserId: todoUser.id,
      });
    },
  );

  // 6.2 Invalid UUID format → expect error (pass plain string literal)
  await TestValidator.error("invalid UUID format yields error", async () => {
    await api.functional.todoApp.admin.todoUsers.metrics(adminConn, {
      todoUserId: "invalid-uuid",
    });
  });

  // 6.3 Non-existent user → expect error
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent user yields error", async () => {
    await api.functional.todoApp.admin.todoUsers.metrics(adminConn, {
      todoUserId: randomId,
    });
  });
}
