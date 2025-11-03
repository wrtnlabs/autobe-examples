import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppUserMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserMetrics";

export async function test_api_user_metrics_aggregation(
  connection: api.IConnection,
) {
  // 1) Register a fresh todo user and capture authorization
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Save todoUserId for metrics
  const todoUserId: string & tags.Format<"uuid"> = authorized.id;

  // 2) Create a todo list for the user
  const listBody = {
    title: "Metrics Test List",
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: listBody,
    },
  );
  typia.assert(list);

  // 3) Create three tasks under the list: completed, overdue, upcoming
  const pastISO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const futureISO = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Task A: completed
  const taskAReq = {
    title: "Task A - completed",
    isCompleted: true,
  } satisfies ITodoAppTask.ICreate;
  const taskA: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: taskAReq,
    });
  typia.assert(taskA);

  // Task B: overdue (dueDate in the past)
  const taskBReq = {
    title: "Task B - overdue",
    dueDate: pastISO,
    isCompleted: false,
  } satisfies ITodoAppTask.ICreate;
  const taskB: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: taskBReq,
    });
  typia.assert(taskB);

  // Task C: upcoming (dueDate in the future)
  const taskCReq = {
    title: "Task C - upcoming",
    dueDate: futureISO,
  } satisfies ITodoAppTask.ICreate;
  const taskC: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: taskCReq,
    });
  typia.assert(taskC);

  // 4) Call metrics endpoint and validate ITodoAppUserMetrics
  const metrics: ITodoAppUserMetrics =
    await api.functional.todoApp.todoUser.todoUsers.metrics(connection, {
      todoUserId,
    });
  typia.assert(metrics);

  // Business assertions
  TestValidator.equals("totalTasks should be 3", metrics.totalTasks, 3);
  TestValidator.equals(
    "completedTasksCount should be 1",
    metrics.completedTasksCount,
    1,
  );
  TestValidator.equals(
    "overdueTasksCount should be 1",
    metrics.overdueTasksCount,
    1,
  );
  TestValidator.equals(
    "activeListsCount should be 1",
    metrics.activeListsCount,
    1,
  );

  // completionRate consistency: completed / total (guard against totalTasks===0)
  TestValidator.predicate(
    "completionRate equals completed/total",
    Math.abs(
      metrics.completionRate -
        (metrics.totalTasks === 0
          ? 0
          : metrics.completedTasksCount / metrics.totalTasks),
    ) < 1e-6,
  );

  // averageTimeToCompleteSeconds is either number or null
  TestValidator.predicate(
    "averageTimeToCompleteSeconds is number or null",
    metrics.averageTimeToCompleteSeconds === null ||
      typeof metrics.averageTimeToCompleteSeconds === "number",
  );

  // lastActiveAt presence is validated by typia.assert (format checked); ensure property exists
  TestValidator.predicate(
    "lastActiveAt present (may be null)",
    metrics.lastActiveAt !== undefined,
  );

  // 5) Negative checks
  // 5a) Non-existent user (valid UUID but not present) should cause an error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent user metrics request should fail",
    async () => {
      await api.functional.todoApp.todoUser.todoUsers.metrics(connection, {
        todoUserId: nonExistentId,
      });
    },
  );

  // 5b) Unauthorized access: use an unauthenticated connection clone
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.todoApp.todoUser.todoUsers.metrics(unauthConn, {
      todoUserId,
    });
  });
}
