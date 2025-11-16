import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoAdminAudit";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminAudit";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todo_admin_audit_list_filtered_by_action_and_admin(
  connection: api.IConnection,
) {
  // 1. Register adminA and obtain authorized context
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminA: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminA);

  // 2. As adminA, create at least one Todo status so catalogue is populated
  const statusCreateBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  // 3. Register a todoUser and create a Todo as that user
  const todoUserPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: todoUserPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinRequest,
    });
  typia.assert(todoUser);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 4. Switch back to adminA (to ensure we are an admin when calling adminAudits.index)
  const adminLoginRequest = {
    email: adminJoinRequest.email,
    password: adminJoinRequest.password,
    ip: null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminALogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminALogin);

  TestValidator.equals(
    "admin login should return same admin id as join",
    adminALogin.id,
    adminA.id,
  );

  // 5. Call adminAudits.index filtered by admin_id and scoped to createdTodo.id
  const auditRequestBody = {
    page: 1,
    limit: 20,
    action: null,
    field_name: null,
    admin_id: adminA.id,
    created_from: null,
    created_to: null,
  } satisfies ITodoAppTodoAdminAudit.IRequest;

  const auditPage: IPageITodoAppTodoAdminAudit.ISummary =
    await api.functional.todoApp.todoAdmin.todos.adminAudits.index(connection, {
      todoId: createdTodo.id,
      body: auditRequestBody,
    });
  typia.assert(auditPage);

  // 6. Basic pagination assertions
  TestValidator.predicate(
    "pagination current page should be non-negative",
    auditPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    auditPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    auditPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    auditPage.pagination.pages >= 0,
  );

  // 7. Verify every returned audit matches admin_id and todoId
  for (const audit of auditPage.data) {
    typia.assert<ITodoAppTodoAdminAudit.ISummary>(audit);

    TestValidator.equals(
      "audit admin.id should equal filter adminA.id",
      audit.admin.id,
      adminA.id,
    );

    TestValidator.equals(
      "audit todo.id should equal path todoId",
      audit.todo.id,
      createdTodo.id,
    );
  }

  if (auditPage.data.length > 0) {
    TestValidator.predicate(
      "pagination.records should be at least number of returned audits",
      auditPage.pagination.records >= auditPage.data.length,
    );
  }

  // 8. Negative scenario: todoUser must not be able to access admin audits
  const userLoginRequest = {
    email: userJoinRequest.email,
    password: todoUserPassword,
    ip: null,
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const loggedInUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginRequest,
    });
  typia.assert(loggedInUser);

  await TestValidator.error(
    "todoUser must not access admin audits",
    async () => {
      await api.functional.todoApp.todoAdmin.todos.adminAudits.index(
        connection,
        {
          todoId: createdTodo.id,
          body: auditRequestBody,
        },
      );
    },
  );
}
