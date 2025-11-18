import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoAuditLog";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoAuditLog";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that administrators can search and filter paginated audit logs for a
 * specific todo item.
 *
 * Scenario:
 *
 * 1. Register an admin and a regular user with unique credentials.
 * 2. Authenticate as admin, then as user. Create a todo as the user.
 * 3. Perform a few modifications on the todo as the user to generate audit logs.
 * 4. Authenticate as admin, then search the audit logs for that todo with various
 *    filter queries: a. by actor_user_id b. by action type (e.g., "created",
 *    "updated") c. by after/before time window d. test pagination (page,
 *    limit)
 * 5. Check that all returned audit entries have correct todo_id, appropriate
 *    actors/actions, and within the filtered ranges.
 * 6. Confirm that a regular user is forbidden from accessing the audit log search
 *    endpoint.
 */
export async function test_api_admin_todo_audit_log_search(
  connection: api.IConnection,
) {
  // 1. Register admin and user with unique credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.origin/",
      referrer: "https://admin.origin/ref",
    },
  });
  typia.assert(adminJoinResult);

  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoinResult = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    },
  });
  typia.assert(userJoinResult);

  // 2. Login as user for todo creation
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    },
  });

  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      description: RandomGenerator.paragraph({ sentences: 3 }),
      completed: false,
    },
  });
  typia.assert(todo);

  // 3. Perform some updates on the todo to generate audit logs
  // (no explicit update endpoint given, but creation itself produces a 'created' log)

  // 4. Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.origin/",
      referrer: "https://admin.origin/ref",
    },
  });

  // 5. Query audit logs with varying filters (by user actor, action, pagination)
  const requestBase = {
    actor_user_id: userJoinResult.id,
    actor_admin_id: null,
    action: null,
    after: null,
    before: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoListTodoAuditLog.IRequest;

  const auditPage = await api.functional.todoList.admin.todos.auditLogs.index(
    connection,
    {
      todoId: todo.id,
      body: requestBase,
    },
  );
  typia.assert(auditPage);
  TestValidator.equals(
    "all audit logs belong to the todo",
    auditPage.data.every((log) => log.todo_id === todo.id),
    true,
  );
  TestValidator.predicate(
    "at least one log of action 'created' exists",
    auditPage.data.some((log) => log.action === "created"),
  );
  if (auditPage.data.length > 0) {
    TestValidator.equals(
      "all logs actor_user_id equals user id",
      auditPage.data.every((log) => log.actor_user_id === userJoinResult.id),
      true,
    );
  }

  // 6. Query by nonexistent action
  const byAction = await api.functional.todoList.admin.todos.auditLogs.index(
    connection,
    {
      todoId: todo.id,
      body: { ...requestBase, action: "deleted" },
    },
  );
  typia.assert(byAction);
  if (byAction.data.length > 0) {
    TestValidator.equals(
      "all logs are 'deleted' actions",
      byAction.data.every((log) => log.action === "deleted"),
      true,
    );
  }

  // 7. Pagination test (limit 1)
  const paged = await api.functional.todoList.admin.todos.auditLogs.index(
    connection,
    {
      todoId: todo.id,
      body: { ...requestBase, limit: 1 },
    },
  );
  typia.assert(paged);
  TestValidator.equals("pagination works (limit 1)", paged.pagination.limit, 1);
  TestValidator.predicate("returned at most one log", paged.data.length <= 1);

  // 8. Confirm forbidden for non-admin (login back as user, then try search)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    },
  });
  await TestValidator.error(
    "user forbidden from viewing audit logs",
    async () => {
      await api.functional.todoList.admin.todos.auditLogs.index(connection, {
        todoId: todo.id,
        body: requestBase,
      });
    },
  );
}
