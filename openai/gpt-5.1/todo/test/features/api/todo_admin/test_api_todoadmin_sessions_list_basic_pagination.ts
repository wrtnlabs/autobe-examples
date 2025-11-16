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

export async function test_api_todoadmin_sessions_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register Admin A via /auth/todoAdmin/join to create the first session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/signup",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorizedFromJoin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorizedFromJoin);

  const adminId: string & tags.Format<"uuid"> = adminAuthorizedFromJoin.id;

  // 2. Perform an additional login for Admin A to ensure multiple sessions
  const adminLoginBody = {
    email: adminAuthorizedFromJoin.email,
    password: adminJoinBody.password,
    ip: "127.0.0.2",
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminAuthorizedFromLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorizedFromLogin);

  TestValidator.equals(
    "admin id should be stable between join and login",
    adminAuthorizedFromLogin.id,
    adminAuthorizedFromJoin.id,
  );

  // 3. As Admin, create at least one Todo status to simulate admin activity
  const statusCreateBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(6)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  TestValidator.equals(
    "created status code should match request",
    createdStatus.code,
    statusCreateBody.code,
  );

  // 4. Register and login a todoUser, then create a Todo item to simulate usage
  const todoUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: "192.168.0.10",
    href: "https://todo-app.test/signup",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorizedFromJoin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userAuthorizedFromJoin);

  const todoUserLoginBody = {
    email: userAuthorizedFromJoin.email,
    password: todoUserJoinBody.password,
    ip: "192.168.0.11",
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userAuthorizedFromLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: todoUserLoginBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userAuthorizedFromLogin);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString() as string & tags.Format<"date-time">,
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  TestValidator.equals(
    "todo status code should match created status",
    createdTodo.status.code,
    createdStatus.code,
  );

  // 5. Using Admin A’s JWT (already applied by last admin login),
  // call PATCH /todoApp/todoAdmin/todoAdmins/{todoAdminId}/sessions with pagination
  const requestPage = 0 as number & tags.Type<"int32">;
  const requestLimit = 10 as number & tags.Type<"int32">;

  // Ensure admin token is active by logging in again just before listing
  const adminAuthorizedForListing: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorizedForListing);

  const sessionRequestBody = {
    page: requestPage,
    limit: requestLimit,
  } satisfies ITodoAppTodoAdminSession.IRequest;

  const sessionPage: IPageITodoAppTodoadminSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
      connection,
      {
        todoAdminId: adminId,
        body: sessionRequestBody,
      },
    );
  typia.assert<IPageITodoAppTodoadminSession.ISummary>(sessionPage);

  const pagination = sessionPage.pagination;
  const sessions = sessionPage.data;

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  TestValidator.predicate(
    "records count is at least number of returned items",
    pagination.records >= sessions.length,
  );

  if (pagination.pages > 0) {
    TestValidator.predicate(
      "current page index is within range [0, pages)",
      pagination.current < pagination.pages,
    );
  }

  TestValidator.predicate(
    "page length is not greater than limit",
    sessions.length <= pagination.limit,
  );

  // We have at least 2 sessions for this admin: join + login, possibly more
  TestValidator.predicate(
    "records should be at least 2 for admin sessions (join + login)",
    pagination.records >= 2,
  );

  // Every session summary must belong to the same admin and have key fields
  for (const summary of sessions) {
    typia.assert<ITodoAppTodoAdminSession.ISummary>(summary);

    TestValidator.equals(
      "session.todoAdmin.id should match admin id",
      summary.todoAdmin.id,
      adminId,
    );

    TestValidator.predicate(
      "session ip must be non-empty string",
      summary.ip.length > 0,
    );
    TestValidator.predicate(
      "session href must be non-empty string",
      summary.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer must be non-empty string",
      summary.referrer.length > 0,
    );
  }
}
