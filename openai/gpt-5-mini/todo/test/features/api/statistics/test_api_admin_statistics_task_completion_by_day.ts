import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTaskCompletionByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTaskCompletionByDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCompletionByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletionByDay";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_admin_statistics_task_completion_by_day(
  connection: api.IConnection,
) {
  /**
   * Test overview:
   *
   * 1. Create a todoUser account (connUser) and a todo list owned by that user
   * 2. Create multiple tasks under the list; create some with isCompleted: true so
   *    the server will set completedAt (now)
   * 3. Create an admin account (connAdmin)
   * 4. As admin, call the statistics endpoint and assert today's aggregated
   *    completedCount equals the number of tasks created as completed above
   * 5. Validate access control: unauthenticated and non-admin callers are rejected
   */

  // --- 1) Prepare isolated connection objects for each actor ---
  const connUser: api.IConnection = { ...connection, headers: {} };
  const connAdmin: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1.1 Create todoUser account and obtain token (connUser will be updated by SDK)
  const todoUser = await api.functional.auth.todoUser.join(connUser, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: "http://example.com/signup",
      referrer: "http://example.com",
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(todoUser);

  // 2) Create a todo list owned by the todoUser
  const list = await api.functional.todoApp.todoUser.lists.create(connUser, {
    body: {
      title: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      visibility: "private",
    } satisfies ITodoAppList.ICreate,
  });
  typia.assert(list);

  // 3) Create multiple tasks with varied completion state
  const createdTasks: ITodoAppTask[] = [];

  const taskBodies = [
    {
      title: "Task - completed on create",
      description: "completed",
      isCompleted: true,
    },
    {
      title: "Task - not completed",
      description: "pending",
      isCompleted: false,
    },
    {
      title: "Task - completed on create 2",
      description: "completed2",
      isCompleted: true,
    },
  ] as const;

  for (const body of taskBodies) {
    const created = await api.functional.todoApp.todoUser.lists.tasks.create(
      connUser,
      {
        listId: list.id,
        body: {
          title: body.title,
          description: body.description,
          isCompleted: body.isCompleted,
        } satisfies ITodoAppTask.ICreate,
      },
    );
    typia.assert(created);
    createdTasks.push(created);
  }

  // Count how many tasks were created as completed (server will set completedAt)
  const expectedCompletedCount = createdTasks.filter(
    (t) => t.isCompleted === true,
  ).length;

  // 4) Create admin actor (connAdmin)
  const admin = await api.functional.auth.admin.join(connAdmin, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin-password-1",
      display_name: RandomGenerator.name(),
      role: "superadmin",
      href: "http://example.com/admin/signup",
      referrer: "http://example.com",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // 5) As admin, call statistics endpoint
  const page: IPageITodoAppTaskCompletionByDay.ISummary =
    await api.functional.todoApp.admin.statistics.task_completion_by_day.taskCompletionByDay(
      connAdmin,
    );
  typia.assert(page);

  // 5.1 Validate that today's bucket exists and completedCount matches
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const todays = page.data.find((d) => d.date === today);

  TestValidator.predicate(
    "statistics contains today bucket",
    todays !== undefined,
  );

  if (todays !== undefined) {
    TestValidator.equals(
      "completedCount matches created completed tasks",
      todays.completedCount,
      expectedCompletedCount,
    );
  }

  // 6) Access control checks
  // 6.1 Unauthenticated should be rejected
  await TestValidator.httpError(
    "unauthenticated caller should be rejected",
    [401, 403],
    async () =>
      await api.functional.todoApp.admin.statistics.task_completion_by_day.taskCompletionByDay(
        unauthConn,
      ),
  );

  // 6.2 Non-admin authenticated (todoUser) should be rejected
  await TestValidator.httpError(
    "non-admin caller should be rejected",
    [401, 403],
    async () =>
      await api.functional.todoApp.admin.statistics.task_completion_by_day.taskCompletionByDay(
        connUser,
      ),
  );
}
