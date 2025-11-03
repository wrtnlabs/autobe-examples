import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserActivityLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import type { ITodoAppUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserActivityLog";

export async function test_api_activity_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  /**
   * E2E scenario:
   *
   * 1. Create admin (adminConn)
   * 2. Create todoUser (userConn)
   * 3. Create a list and a task under the todoUser account
   * 4. Use admin index to locate the activity log entry created by the task action
   * 5. Use admin detail endpoint to retrieve full forensic activity log
   * 6. Validate happy-path and error cases
   */

  // 0. Prepare isolated connection objects so SDK places tokens on the right connection
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };

  // 1. Admin sign-up (creates an admin and sets adminConn.headers.Authorization)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    adminConn,
    {
      body: {
        email: adminEmail,
        password: "AdminPassw0rd!",
        display_name: RandomGenerator.name(),
        role: "superadmin",
        href: "https://example.com/admin/signup",
        referrer: "https://example.com",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. TodoUser sign-up (creates a todo user and sets userConn.headers.Authorization)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(userConn, {
      body: {
        email: userEmail,
        password: "UserPassw0rd!",
        displayName: RandomGenerator.name(),
        href: "https://example.com/user/signup",
        referrer: "https://example.com",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(todoUser);

  // 3. Create a todo list as the todoUser
  const listTitle = RandomGenerator.name(3);
  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    userConn,
    {
      body: {
        title: listTitle,
        description: RandomGenerator.paragraph({ sentences: 6 }),
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    },
  );
  typia.assert(list);

  // 4. Create a task under the list to generate an activity log
  const taskTitle = "E2E test task - activity log generation";
  const task: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(userConn, {
      listId: list.id,
      body: {
        title: taskTitle,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        isCompleted: false,
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(task);

  // 5. Admin searches activity logs to find the entry created by the todoUser action
  const indexPage: IPageITodoAppUserActivityLog.ISummary =
    await api.functional.todoApp.admin.activityLogs.index(adminConn, {
      body: {
        actorId: todoUser.id,
        listId: list.id,
        taskId: task.id,
        page: 1,
        pageSize: 25,
        sortBy: "createdAt",
        order: "desc",
      } satisfies ITodoAppUserActivityLog.IRequest,
    });
  typia.assert(indexPage);

  // Ensure at least one activity is present
  TestValidator.predicate(
    "activity index includes at least one record",
    Array.isArray(indexPage.data) && indexPage.data.length > 0,
  );

  // Capture the first activity summary id
  const activitySummary = indexPage.data[0];
  typia.assert(activitySummary);
  TestValidator.predicate(
    "activity summary has id",
    activitySummary.id !== undefined && activitySummary.id !== null,
  );
  const activityId: string = activitySummary.id;

  // 6. Admin retrieves the detailed activity log by id
  const activity: ITodoAppUserActivityLog =
    await api.functional.todoApp.admin.activityLogs.at(adminConn, {
      activityLogId: activityId,
    });
  typia.assert(activity);

  // Validate forensic fields presence
  TestValidator.predicate(
    "activity has createdAt",
    activity.createdAt !== undefined && activity.createdAt !== null,
  );
  TestValidator.predicate(
    "activity has eventType",
    typeof activity.eventType === "string" && activity.eventType.length > 0,
  );

  // Validate references to actor/list/task exist and match
  TestValidator.predicate(
    "activity contains user summary or admin summary",
    (activity.user !== null && activity.user !== undefined) ||
      (activity.admin !== null && activity.admin !== undefined),
  );

  if (activity.user) {
    const actor = typia.assert<ITodoAppTodoUser.ISummary>(activity.user);
    TestValidator.equals(
      "activity user matches created todoUser",
      actor.id,
      todoUser.id,
    );
  }

  if (activity.list) {
    const refList = typia.assert<ITodoAppList.ISummary>(activity.list);
    TestValidator.equals(
      "activity list matches created list",
      refList.id,
      list.id,
    );
  }

  if (activity.task) {
    const refTask = typia.assert<ITodoAppTask.ISummary>(activity.task);
    TestValidator.equals(
      "activity task matches created task",
      refTask.id,
      task.id,
    );
  }

  // 7. Edge cases & error handling
  // 7.1 Invalid UUID format should raise an error (400)
  await TestValidator.error("invalid UUID format should error", async () => {
    await api.functional.todoApp.admin.activityLogs.at(adminConn, {
      // invalid UUID string passed directly (no as any)
      activityLogId: "invalid-uuid-format",
    });
  });

  // 7.2 Non-existent but valid UUID should return an error (404)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent activity id should error",
    async () => {
      await api.functional.todoApp.admin.activityLogs.at(adminConn, {
        activityLogId: randomId,
      });
    },
  );

  // 7.3 Unauthorized access: todoUser token should NOT be able to fetch admin detail
  await TestValidator.error(
    "non-admin cannot access admin activity detail",
    async () => {
      await api.functional.todoApp.admin.activityLogs.at(userConn, {
        activityLogId: activityId,
      });
    },
  );
}
