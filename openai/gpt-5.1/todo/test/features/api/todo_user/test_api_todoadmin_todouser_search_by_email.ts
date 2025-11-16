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

export async function test_api_todoadmin_todouser_search_by_email(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin and get admin authorization
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "admin-password-1234",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a todoUser who will be searched by email
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const userJoinBody = {
    email: userEmail,
    password: "user-password-1234",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 3. As the todoUser, create at least one Todo for realism
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    status_code: undefined,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 4. Switch back to admin by logging in explicitly
  const adminLoginBody = {
    email: adminEmail,
    password: "admin-password-1234",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoggedIn: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Search todo users by the known email
  const searchBody = {
    page: 1,
    limit: 10,
    email: userEmail,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    last_login_from: undefined,
    last_login_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ITodoAppTodoUser.IRequest;

  const searchResult: IPageITodoAppTodouser.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.index(connection, {
      body: searchBody,
    });
  typia.assert(searchResult);

  const pagination = searchResult.pagination;
  const summaries = searchResult.data;

  // Ensure at least one record is found
  TestValidator.predicate(
    "todoAdmin search by existing email returns at least one record",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "todoAdmin search by existing email returns non-empty data array",
    summaries.length >= 1,
  );

  // Every summary must have the requested email
  for (const summary of summaries) {
    TestValidator.equals(
      "each returned todoUser summary has the requested email",
      summary.email,
      userEmail,
    );
  }

  TestValidator.predicate(
    "no summary has email different from requested email",
    summaries.every((s) => s.email === userEmail),
  );

  // 7. Negative case: search with a non-existing email
  const nonexistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const negativeSearchBody = {
    page: 1,
    limit: 10,
    email: nonexistentEmail,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    last_login_from: undefined,
    last_login_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ITodoAppTodoUser.IRequest;

  const negativeResult: IPageITodoAppTodouser.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.index(connection, {
      body: negativeSearchBody,
    });
  typia.assert(negativeResult);

  TestValidator.equals(
    "search with non-existing email returns zero records",
    negativeResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "search with non-existing email returns empty data array",
    negativeResult.data.length,
    0,
  );
}
