import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todouser_detail_requires_todoadmin_auth(
  connection: api.IConnection,
) {
  // 1. Create a real todoUser so we have a concrete todoUserId
  const todoUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUserAuthorized);

  const createdTodoUserId = todoUserAuthorized.id;
  const createdTodoUserEmail = todoUserAuthorized.email;

  // 2. Prepare a todoAdmin account (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://todo-app.example.com/admin/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorizedFromJoin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 3. Create a Todo status to satisfy dependency intent
  const sortOrderValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const statusCreateBody = {
    code: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: sortOrderValue,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(status);

  // 4. Create at least one Todo for the todoUser (mainly to exercise dependencies)
  // Switch to todoUser context explicitly via login (even though join already authenticated)
  const todoUserLoginBody = {
    email: todoUserAuthorized.email,
    password: todoUserJoinBody.password,
    ip: todoUserJoinBody.ip ?? undefined,
    href: todoUserJoinBody.href,
    referrer: todoUserJoinBody.referrer,
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const todoUserAuthorizedFromLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: todoUserLoginBody,
    });
  typia.assert(todoUserAuthorizedFromLogin);

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

  // 5. Unauthenticated access attempt using a fresh connection without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated todoAdmin access to todo user detail must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.at(unauthConn, {
        todoUserId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Authenticated admin access should succeed
  // Ensure we are authenticated as todoAdmin via login (exercise dependency)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminAuthorizedFromLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  const fetchedTodoUser: ITodoAppTodoUser =
    await api.functional.todoApp.todoAdmin.todoUsers.at(connection, {
      todoUserId: createdTodoUserId,
    });
  typia.assert(fetchedTodoUser);

  // 7. Business assertions
  TestValidator.equals(
    "fetched todo user id should match created todo user id",
    fetchedTodoUser.id,
    createdTodoUserId,
  );

  TestValidator.equals(
    "fetched todo user email should match created todo user email",
    fetchedTodoUser.email,
    createdTodoUserEmail,
  );
}
