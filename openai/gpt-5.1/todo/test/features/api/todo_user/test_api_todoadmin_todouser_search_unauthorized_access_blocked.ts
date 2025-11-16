import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todoadmin_todouser_search_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Prepare admin account and at least one Todo status for a realistic environment.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Create at least one Todo status as admin
  const todoStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo status",
    group: "core",
    sort_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusBody,
    });
  typia.assert(status);

  // 2. Register a normal todoUser and create a sample Todo for realism.
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const todoUserJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // Create a todo as the normal user (connection is now authenticated as todoUser)
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todo);

  // Common search body for admin user search
  const searchBody = {
    page: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies ITodoAppTodoUser.IRequest;

  // 3. Attempt to call admin todoUsers search as todoUser (should fail).
  await TestValidator.error(
    "todoUser cannot access admin todoUsers search",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.index(connection, {
        body: searchBody,
      });
    },
  );

  // 4. Attempt to call admin todoUsers search as anonymous (no Authorization header).
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous cannot access admin todoUsers search",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.index(unauthConn, {
        body: searchBody,
      });
    },
  );

  // 5. Positive sanity check: login as admin and verify the search works.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.todo-app.local/login",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoggedIn: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const page: IPageITodoAppTodouser.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.index(connection, {
      body: searchBody,
    });
  typia.assert(page);

  TestValidator.predicate("admin search returns coherent pagination", () => {
    const p = page.pagination;
    return p.limit >= 0 && p.current >= 0 && p.pages >= 0 && p.records >= 0;
  });
}
