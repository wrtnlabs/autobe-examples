import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_audit_log_index_admin_search(
  connection: api.IConnection,
) {
  /**
   * Test: Admin can search audit logs and discover events produced by todoUser
   * actions.
   *
   * Steps:
   *
   * 1. Create a todoUser (self-signup) -> ITodoAppTodoUser.IAuthorized
   * 2. As that user, create a list -> ITodoAppList
   * 3. As that user, create a task under the list -> ITodoAppTask
   * 4. Create an admin (self-signup) -> ITodoAppAdmin.IAuthorized
   * 5. As admin, search audit logs with a recent time-window and filters to locate
   *    events related to the created list/task
   * 6. Assert pagination metadata and that at least one returned item references
   *    the created listId or taskId
   * 7. Negative checks: unauthenticated and non-admin access must be rejected
   */

  // 1) Create todo user
  const todoUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1",
    href: "https://example.com/signup",
    referrer: "https://example.com/",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserBody,
    });
  typia.assert(todoUser);

  // 2) Create a todo list as the todoUser (SDK sets Authorization on connection)
  const listBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 8,
    }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: listBody,
    },
  );
  typia.assert(list);

  // 3) Create a task under the list as the todoUser
  const taskBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isCompleted: false,
  } satisfies ITodoAppTask.ICreate;

  const task: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: taskBody,
    });
  typia.assert(task);

  // 4) Create an admin account and capture its authorization (SDK will set token on connection)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminP@ss1",
    href: "https://example.com/admin-signup",
    referrer: "https://example.com/",
    display_name: RandomGenerator.name(),
    role: "superadmin",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  typia.assert(admin);

  // 5) As admin, query audit logs for recent events related to created list/task
  const now = Date.now();
  const createdAfter = new Date(now - 5 * 60 * 1000).toISOString(); // 5 minutes ago
  const createdBefore = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes in future

  const auditRequest = {
    createdAfter,
    createdBefore,
    listId: list.id,
    taskId: task.id,
    page: 1,
    limit: 20,
    order: "desc",
    sortBy: "createdAt",
  } satisfies ITodoAppAuditLog.IRequest;

  const page: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: auditRequest,
    });
  typia.assert(page);

  // Validate pagination info
  TestValidator.predicate("pagination exists and has fields", () => {
    return (
      page.pagination !== null &&
      typeof page.pagination.current === "number" &&
      typeof page.pagination.limit === "number" &&
      typeof page.pagination.records === "number"
    );
  });

  // Validate that at least one item references our listId or taskId
  const found = page.data.some(
    (item) =>
      item.targetId === list.id ||
      item.targetId === task.id ||
      (item.list && item.list.id === list.id) ||
      (item.task && item.task.id === task.id),
  );
  TestValidator.predicate(
    "audit results include events for created resources",
    found,
  );

  // 6) Negative tests: unauthenticated and non-admin should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated request to admin audit logs should fail",
    async () => {
      await api.functional.todoApp.admin.auditLogs.index(unauthConn, {
        body: auditRequest,
      });
    },
  );

  // Also test that a non-admin user cannot access admin endpoint
  const nonAdminConn: api.IConnection = { ...connection, headers: {} };
  const nonAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd2",
    href: "https://example.com/signup",
    referrer: "https://example.com/",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const nonAdmin = await api.functional.auth.todoUser.join(nonAdminConn, {
    body: nonAdminBody,
  });
  typia.assert(nonAdmin);

  await TestValidator.error(
    "non-admin user cannot access admin audit logs",
    async () => {
      await api.functional.todoApp.admin.auditLogs.index(nonAdminConn, {
        body: auditRequest,
      });
    },
  );
}
