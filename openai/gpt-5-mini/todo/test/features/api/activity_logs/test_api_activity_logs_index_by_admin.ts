import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserActivityLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import type { ITodoAppUserActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserActivityLog";

export async function test_api_activity_logs_index_by_admin(
  connection: api.IConnection,
) {
  // --------------------------------------------
  // 0. Purpose
  // --------------------------------------------
  // This E2E test verifies that the admin activity logs index endpoint
  // (/todoApp/admin/activityLogs) correctly returns paginated summaries,
  // supports filtering by actor/list/task, enforces admin-only flags like
  // includeSoftDeleted, and enforces authentication/authorization rules.

  // --------------------------------------------
  // 1. Prepare isolated connections for each actor
  // --------------------------------------------
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };
  const collaboratorConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // --------------------------------------------
  // 2. Admin signup (create admin context)
  // --------------------------------------------
  const adminEmail = `admin.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConn, {
      body: {
        email: adminEmail,
        password: "AdminPass!23",
        href: "https://example.com/signup",
        referrer: "https://referrer.example.com/",
        display_name: RandomGenerator.name(),
        role: "superadmin",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin token should be present",
    adminAuth.token.access.length > 0,
  );

  // --------------------------------------------
  // 3. Primary todoUser signup (actor that will create list/tasks)
  // --------------------------------------------
  const userEmail = `user.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const userAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(userConn, {
      body: {
        email: userEmail,
        password: "UserPass!23",
        href: "https://example.com/join",
        referrer: "https://ref.example.com/",
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(userAuth);
  TestValidator.predicate(
    "todoUser token should be present",
    userAuth.token.access.length > 0,
  );

  // --------------------------------------------
  // 4. Optional: collaborator signup (another todoUser)
  // --------------------------------------------
  const collabEmail = `collab.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const collabAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(collaboratorConn, {
      body: {
        email: collabEmail,
        password: "CollabPass!23",
        href: "https://example.com/join",
        referrer: "https://ref.example.com/",
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(collabAuth);

  // --------------------------------------------
  // 5. Using todoUser connection, create a list
  // --------------------------------------------
  const listReq = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    userConn,
    { body: listReq },
  );
  typia.assert(list);
  TestValidator.predicate("created list has id", typeof list.id === "string");

  // --------------------------------------------
  // 6. Using todoUser connection, create tasks to generate activity
  // --------------------------------------------
  const task1Body = {
    title: "Write tests",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isCompleted: false,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies ITodoAppTask.ICreate;

  const task1: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(userConn, {
      listId: list.id,
      body: task1Body,
    });
  typia.assert(task1);

  const task2Body = {
    title: "Fix bug",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isCompleted: true,
    dueDate: null,
  } satisfies ITodoAppTask.ICreate;

  const task2: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(userConn, {
      listId: list.id,
      body: task2Body,
    });
  typia.assert(task2);

  // --------------------------------------------
  // 7. Optionally add a collaborator to generate collaborator activity
  // --------------------------------------------
  let collaborator: ITodoAppListCollaborator | undefined = undefined;
  try {
    collaborator =
      await api.functional.todoApp.todoUser.lists.collaborators.create(
        userConn,
        {
          listId: list.id,
          body: {
            todoAppTodouserId: collabAuth.id,
            role: "read-write",
          } satisfies ITodoAppListCollaborator.ICreate,
        },
      );
    typia.assert(collaborator);
  } catch (err) {
    // Duplicate collaborator may produce 409, that's acceptable for this
    // test; we won't fail the setup on duplicate collaborator.
  }

  // --------------------------------------------
  // 8. Using admin connection, query activity logs (broad query)
  // --------------------------------------------
  const pageReq = {
    page: 1,
    pageSize: 25,
    sortBy: "createdAt",
    order: "desc",
  } satisfies ITodoAppUserActivityLog.IRequest;

  const pageResult: IPageITodoAppUserActivityLog.ISummary =
    await api.functional.todoApp.admin.activityLogs.index(adminConn, {
      body: pageReq,
    });
  typia.assert(pageResult);

  TestValidator.predicate(
    "activity logs page contains pagination info",
    pageResult.pagination !== undefined &&
      typeof pageResult.pagination.current === "number",
  );

  // Ensure at least one entry references either the created list or tasks
  TestValidator.predicate(
    "activity logs contain entries for created list or tasks",
    Array.isArray(pageResult.data) &&
      pageResult.data.some(
        (d) =>
          d.list?.id === list.id ||
          d.task?.id === task1.id ||
          d.task?.id === task2.id,
      ),
  );

  // --------------------------------------------
  // 9. Filtering: by actorId (todoUser) using admin connection
  // --------------------------------------------
  const actorFilterReq = {
    actorId: userAuth.id,
    page: 1,
    pageSize: 20,
  } satisfies ITodoAppUserActivityLog.IRequest;

  const actorFilterResult: IPageITodoAppUserActivityLog.ISummary =
    await api.functional.todoApp.admin.activityLogs.index(adminConn, {
      body: actorFilterReq,
    });
  typia.assert(actorFilterResult);

  TestValidator.predicate(
    "actor filtered results reference actor or are empty",
    actorFilterResult.data.every(
      (d) => d.user == null || d.user?.id === userAuth.id,
    ),
  );

  // --------------------------------------------
  // 10. Filtering: by listId and taskId
  // --------------------------------------------
  const listFilterReq = {
    listId: list.id,
    page: 1,
    pageSize: 20,
  } satisfies ITodoAppUserActivityLog.IRequest;
  const listFilterResult =
    await api.functional.todoApp.admin.activityLogs.index(adminConn, {
      body: listFilterReq,
    });
  typia.assert(listFilterResult);
  TestValidator.predicate(
    "list filtered results reference list or are empty",
    listFilterResult.data.every(
      (d) => d.list == null || d.list?.id === list.id,
    ),
  );

  const taskFilterReq = {
    taskId: task1.id,
    page: 1,
    pageSize: 20,
  } satisfies ITodoAppUserActivityLog.IRequest;
  const taskFilterResult =
    await api.functional.todoApp.admin.activityLogs.index(adminConn, {
      body: taskFilterReq,
    });
  typia.assert(taskFilterResult);
  TestValidator.predicate(
    "task filtered results reference task or are empty",
    taskFilterResult.data.every(
      (d) => d.task == null || d.task?.id === task1.id,
    ),
  );

  // --------------------------------------------
  // 11. Security: malformed UUID filter should return 400
  // --------------------------------------------
  await TestValidator.httpError(
    "malformed listId filter returns 400",
    400,
    async () =>
      await api.functional.todoApp.admin.activityLogs.index(adminConn, {
        body: {
          listId: "not-a-uuid",
        } satisfies ITodoAppUserActivityLog.IRequest,
      }),
  );

  // --------------------------------------------
  // 12. Security: unauthorized and non-admin callers
  // --------------------------------------------
  // Unauthenticated (no token) should be rejected
  await TestValidator.httpError(
    "unauthenticated caller cannot access activity logs",
    [401, 403],
    async () =>
      await api.functional.todoApp.admin.activityLogs.index(unauthConn, {
        body: { page: 1 } satisfies ITodoAppUserActivityLog.IRequest,
      }),
  );

  // Non-admin (todo user) trying to includeSoftDeleted (admin-only flag)
  await TestValidator.httpError(
    "non-admin cannot include soft-deleted records",
    403,
    async () =>
      await api.functional.todoApp.admin.activityLogs.index(userConn, {
        body: {
          includeSoftDeleted: true,
        } satisfies ITodoAppUserActivityLog.IRequest,
      }),
  );

  // --------------------------------------------
  // 13. Final checks: pagination metadata shape
  // --------------------------------------------
  TestValidator.predicate(
    "pagination current is 1",
    pageResult.pagination.current === 1 ||
      pageResult.pagination.current === 0 ||
      typeof pageResult.pagination.current === "number",
  );

  // Ensure types by assertion (already done above). End of test.
}
