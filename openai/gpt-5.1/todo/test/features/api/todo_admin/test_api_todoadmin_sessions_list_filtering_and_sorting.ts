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

export async function test_api_todoadmin_sessions_list_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register Admin A via /auth/todoAdmin/join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Pa$w0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Perform multiple logins for Admin A to create multiple sessions
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  // Create 3 additional sessions via login
  await ArrayUtil.asyncRepeat(3, async () => {
    const loginResult: ITodoAppTodoAdmin.IAuthorized =
      await api.functional.auth.todoAdmin.login(connection, {
        body: adminLoginBody,
      });
    typia.assert(loginResult);
    TestValidator.equals(
      "logged-in admin id matches joined admin id",
      loginResult.id,
      adminId,
    );
  });

  // 3. As Admin A, create one Todo status to simulate realistic admin action
  const todoStatusBody = {
    code: `STATUS_${RandomGenerator.alphabets(5)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const todoStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusBody,
    });
  typia.assert(todoStatus);

  // 4. Create a todoUser and a Todo item for background activity
  const userJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@user.example.com`,
    password: "UserPa$1!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLogin);

  // Create a Todo item
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString() as string & tags.Format<"date-time">,
    status_code: todoStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todo);

  // 5. List admin sessions with different paging/sorting
  const baseRequest: ITodoAppTodoAdminSession.IRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    orderBy: "created_at",
  };

  // 5-A. Descending order
  const descRequest: ITodoAppTodoAdminSession.IRequest = {
    ...baseRequest,
    orderDirection: "desc",
  };

  const descPage: IPageITodoAppTodoadminSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
      connection,
      {
        todoAdminId: adminId,
        body: descRequest,
      },
    );
  typia.assert(descPage);

  // Basic pagination assertions for desc
  TestValidator.predicate(
    "desc: data length does not exceed requested limit",
    descPage.data.length <= (descRequest.limit ?? 0),
  );
  TestValidator.predicate(
    "desc: pagination.limit is at least data length",
    descPage.pagination.limit >= descPage.data.length,
  );

  // All sessions belong to Admin A
  for (const session of descPage.data) {
    TestValidator.equals(
      "desc: session belongs to Admin A",
      session.todoAdmin.id,
      adminId,
    );
  }

  // created_at ordering: non-increasing for desc
  for (let i = 1; i < descPage.data.length; i++) {
    const prev = new Date(descPage.data[i - 1].created_at).getTime();
    const curr = new Date(descPage.data[i].created_at).getTime();
    TestValidator.predicate("desc: created_at is non-increasing", prev >= curr);
  }

  // 5-B. Ascending order
  const ascRequest: ITodoAppTodoAdminSession.IRequest = {
    ...baseRequest,
    orderDirection: "asc",
  };

  const ascPage: IPageITodoAppTodoadminSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
      connection,
      {
        todoAdminId: adminId,
        body: ascRequest,
      },
    );
  typia.assert(ascPage);

  // Basic pagination assertions for asc
  TestValidator.predicate(
    "asc: data length does not exceed requested limit",
    ascPage.data.length <= (ascRequest.limit ?? 0),
  );
  TestValidator.predicate(
    "asc: pagination.limit is at least data length",
    ascPage.pagination.limit >= ascPage.data.length,
  );

  // All sessions belong to Admin A for asc
  for (const session of ascPage.data) {
    TestValidator.equals(
      "asc: session belongs to Admin A",
      session.todoAdmin.id,
      adminId,
    );
  }

  // created_at ordering: non-decreasing for asc
  for (let i = 1; i < ascPage.data.length; i++) {
    const prev = new Date(ascPage.data[i - 1].created_at).getTime();
    const curr = new Date(ascPage.data[i].created_at).getTime();
    TestValidator.predicate("asc: created_at is non-decreasing", prev <= curr);
  }
}
