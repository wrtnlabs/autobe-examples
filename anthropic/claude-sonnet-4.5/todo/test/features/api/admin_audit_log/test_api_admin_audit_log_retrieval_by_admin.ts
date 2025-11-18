import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminAuditLog";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminAuditLog";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an administrator can retrieve a paginated, filtered list of
 * admin audit log records for a specific Todo item.
 *
 * 1. Register an admin and a user; login as both.
 * 2. The user creates a Todo item.
 * 3. The admin retrieves audit logs for the Todo, testing pagination, sorting,
 *    filtering (e.g. by action_type, admin_id), and result linkage to the
 *    Todo.
 * 4. Ensure correct privilege enforcement, security of sensitive details, and
 *    read-only nature of audit log entries.
 * 5. Assert type safety, correct data linkage, and proper access control measures.
 */
export async function test_api_admin_audit_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const href = "https://admin.todo.test/";
  const referrer = "https://todo.test/";

  // Admin join
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(admin);

  // User join
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(user);

  // User login to create Todo
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ILogin,
  });

  // 2. Create a Todo as the user
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: href as string & tags.Format<"uri">,
      referrer: referrer as string & tags.Format<"uri">,
    } satisfies ITodoListAdmin.ILogin,
  });

  // 3. Retrieve audit logs for the Todo with various filter/sort parameters
  //   As a smoke test, try querying all audit logs, with action_type filter, with admin_id filter and pagination

  // Fetch all audit logs for the Todo
  const auditLogPageAll: IPageITodoListAdminAuditLog =
    await api.functional.todoList.admin.todos.adminAuditLogs.index(connection, {
      todoId: todo.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 25 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ITodoListAdminAuditLog.IRequest,
    });
  typia.assert(auditLogPageAll);
  TestValidator.predicate(
    "audit logs are for the requested Todo",
    auditLogPageAll.data.every((log) => log.todo_id === todo.id),
  );
  // If there are entries, they must not be modifiable (read-only test - since API is read-only, just check existence)
  TestValidator.predicate(
    "audit logs are immutable/read-only objects",
    auditLogPageAll.data.length === 0 ||
      !Object.isExtensible(auditLogPageAll.data[0]),
  );

  // Fetch audit logs filtered by action_type (if there are entries)
  let filteredActionType = undefined;
  if (auditLogPageAll.data.length > 0) {
    filteredActionType = auditLogPageAll.data[0].action_type;
    const pageByActionType =
      await api.functional.todoList.admin.todos.adminAuditLogs.index(
        connection,
        {
          todoId: todo.id,
          body: {
            action_type: filteredActionType,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ITodoListAdminAuditLog.IRequest,
        },
      );
    typia.assert(pageByActionType);
    for (const log of pageByActionType.data) {
      TestValidator.equals(
        "log.action_type matches action_type filter",
        log.action_type,
        filteredActionType,
      );
    }
  }

  // Fetch audit logs filtered by admin_id
  const pageByAdminId =
    await api.functional.todoList.admin.todos.adminAuditLogs.index(connection, {
      todoId: todo.id,
      body: {
        admin_id: admin.id,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ITodoListAdminAuditLog.IRequest,
    });
  typia.assert(pageByAdminId);
  for (const log of pageByAdminId.data) {
    TestValidator.equals("log.admin_id matches filter", log.admin_id, admin.id);
    TestValidator.equals(
      "log.todo_id is the correct Todo",
      log.todo_id,
      todo.id,
    );
  }

  // 4. Pagination test: assure less or equal to limit, pages math, data linkage
  TestValidator.predicate(
    "pagination respects page size",
    pageByAdminId.data.length <= 5,
  );
  TestValidator.equals(
    "pagination object has current page = 1",
    pageByAdminId.pagination.current,
    1,
  );
  TestValidator.predicate(
    "todo_id is always the right Todo",
    pageByAdminId.data.every((log) => log.todo_id === todo.id),
  );

  // 5. Authorization enforcement: try to retrieve as regular user (should fail)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ILogin,
  });
  await TestValidator.error("User cannot access admin audit logs", async () => {
    await api.functional.todoList.admin.todos.adminAuditLogs.index(connection, {
      todoId: todo.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  });
}
