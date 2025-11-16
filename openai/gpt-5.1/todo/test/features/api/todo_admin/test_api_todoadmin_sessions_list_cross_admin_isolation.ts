import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoadminSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminSession";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todoadmin_sessions_list_cross_admin_isolation(
  connection: api.IConnection,
) {
  // 1. Register Admin A
  const adminAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin-a.example.com`,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin-a.example.com/join",
    referrer: "https://admin-a.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminA: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  const adminAId = adminA.id;

  // 2. Create an additional session for Admin A via login
  const adminALoginBody = {
    email: adminA.email,
    password: adminAJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://admin-a.example.com/login",
    referrer: "https://admin-a.example.com/dashboard",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminALogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALogin);

  // 3. Register Admin B and create at least one session
  const adminBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin-b.example.com`,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin-b.example.com/join",
    referrer: "https://admin-b.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminB: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  const adminBId = adminB.id;

  const adminBLoginBody = {
    email: adminB.email,
    password: adminBJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://admin-b.example.com/login",
    referrer: "https://admin-b.example.com/dashboard",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminBLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert(adminBLogin);

  // 4. While authenticated as Admin B, create a Todo status to simulate activity
  const todoStatusBody = {
    code: `STATUS_${RandomGenerator.alphabets(5).toUpperCase()}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    group: "core",
    sort_order: 1,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusBody,
    });
  typia.assert(status);

  // 5. Register and login a todoUser, then create a Todo
  const userJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@user.example.com`,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(todoUser);

  const userLoginBody = {
    email: todoUser.email,
    password: userJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/dashboard",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLogin);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: typia.random<string & tags.Format<"date-time">>(),
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todo);

  // 6. Log back in as Admin A to ensure admin token in connection
  const adminARelogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: {
        email: adminA.email,
        password: adminAJoinBody.password,
        ip: RandomGenerator.mobile(),
        href: "https://admin-a.example.com/relogin",
        referrer: "https://admin-a.example.com/return",
      } satisfies ITodoAppTodoAdminLogin.IRequest,
    });
  typia.assert(adminARelogin);

  // 7. List sessions for Admin A and validate isolation
  const adminASessionsRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ITodoAppTodoAdminSession.IRequest;

  const adminASessionsPage: IPageITodoAppTodoadminSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
      connection,
      {
        todoAdminId: adminAId,
        body: adminASessionsRequest,
      },
    );
  typia.assert(adminASessionsPage);

  const adminASessions = adminASessionsPage.data;

  for (const session of adminASessions) {
    typia.assert<ITodoAppTodoAdminSession.ISummary>(session);
    TestValidator.equals(
      "admin A session belongs to admin A",
      session.todoAdmin.id,
      adminAId,
    );
    TestValidator.notEquals(
      "admin A session must not belong to admin B",
      session.todoAdmin.id,
      adminBId,
    );
  }

  const paginationA = adminASessionsPage.pagination;
  TestValidator.predicate(
    "admin A pagination current page is non-negative",
    paginationA.current >= 0,
  );
  TestValidator.predicate(
    "admin A pagination limit is non-negative",
    paginationA.limit >= 0,
  );
  TestValidator.predicate(
    "admin A pagination records is at least data length",
    paginationA.records >= adminASessions.length,
  );

  // 8. From Admin A's context, list sessions for Admin B and validate isolation
  const adminBSessionsRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ITodoAppTodoAdminSession.IRequest;

  const adminBSessionsPage: IPageITodoAppTodoadminSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
      connection,
      {
        todoAdminId: adminBId,
        body: adminBSessionsRequest,
      },
    );
  typia.assert(adminBSessionsPage);

  const adminBSessions = adminBSessionsPage.data;

  for (const session of adminBSessions) {
    typia.assert<ITodoAppTodoAdminSession.ISummary>(session);
    TestValidator.equals(
      "admin B session listing scoped to admin B",
      session.todoAdmin.id,
      adminBId,
    );
    TestValidator.notEquals(
      "admin B session listing must not include admin A sessions",
      session.todoAdmin.id,
      adminAId,
    );
  }

  const paginationB = adminBSessionsPage.pagination;
  TestValidator.predicate(
    "admin B pagination current page is non-negative",
    paginationB.current >= 0,
  );
  TestValidator.predicate(
    "admin B pagination limit is non-negative",
    paginationB.limit >= 0,
  );
  TestValidator.predicate(
    "admin B pagination records is at least data length",
    paginationB.records >= adminBSessions.length,
  );
}
