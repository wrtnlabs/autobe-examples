import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoadmin";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate listing of todoAdmin administrator accounts with basic search and
 * pagination.
 *
 * Business goal: Ensure that an authenticated todoAdmin can call PATCH
 * /todoApp/todoAdmin/todoAdmins to retrieve a paginated list of administrator
 * summaries filtered by a search term, and that the response type and
 * pagination metadata align with the documented DTOs.
 *
 * Steps:
 *
 * 1. Register a primary todoAdmin via /auth/todoAdmin/join. This both creates an
 *    admin record and authenticates the connection as that admin.
 * 2. Optionally register a second todoAdmin to make the dataset less trivial.
 * 3. While authenticated as an admin, create a Todo status via
 *    /todoApp/todoAdmin/todoStatuses to simulate a minimally configured
 *    system.
 * 4. Register a todoUser via /auth/todoUser/join and create at least one Todo via
 *    /todoApp/todoUser/todos/create to ensure the system has operational data
 *    (not directly used by listing, but makes the test environment more
 *    realistic).
 * 5. Re-authenticate as the primary admin using /auth/todoAdmin/login, so the
 *    Authorization header contains the admin token when we call the listing
 *    endpoint.
 * 6. Call api.functional.todoApp.todoAdmin.todoAdmins.index with a body satisfying
 *    ITodoAppTodoAdmin.IRequest, specifying page and limit (e.g. page=1,
 *    limit=10) and a search term which matches the primary admin’s email or
 *    display_name.
 * 7. Assert that the response matches IPageITodoAppTodoadmin.ISummary via
 *    typia.assert and then:
 *
 *    - Pagination.current is a non-negative integer
 *    - Pagination.limit equals the requested limit
 *    - Pagination.records >= data.length
 *    - When data is non-empty, pagination.pages >= 1
 *    - Data array is non-empty
 *    - At least one summary in data matches the primary admin’s id and email
 *    - Summaries expose only non-sensitive fields as per ITodoAppTodoAdmin.ISummary
 *         (typia.assert already guarantees structure).
 * 8. Call the same endpoint again with a non-matching search term and assert that
 *    either the result set does not include the primary admin or is empty,
 *    demonstrating that search filtering is effective.
 */
export async function test_api_todoadmin_list_admin_accounts_basic_search(
  connection: api.IConnection,
) {
  // 1. Register primary todoAdmin (join acts as registration + authentication).
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const primaryAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(primaryAdmin);

  // 2. Optionally register a secondary admin to enrich listing.
  const secondaryAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const secondaryAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const secondaryAdminBody = {
    email: secondaryAdminEmail,
    password: secondaryAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const secondaryAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: secondaryAdminBody,
    });
  typia.assert(secondaryAdmin);

  // 3. Create at least one Todo status as admin.
  const statusBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert(status);

  // 4. Register todoUser and create at least one Todo
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(todoUser);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: new Date().toISOString() as string & tags.Format<"date-time">,
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todo);

  // 5. Re-authenticate as primary admin using login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const loggedInAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 6. Call listing with a matching search term (use part of adminEmail)
  const searchTerm = adminEmail.split("@")[0];

  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: searchTerm,
    status: null,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppTodoAdmin.IRequest;

  const pageResult: IPageITodoAppTodoadmin.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.index(connection, {
      body: listRequestBody,
    });
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const admins = pageResult.data;

  // 7. Business assertions on pagination and data
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    listRequestBody.limit,
  );
  TestValidator.predicate(
    "pagination.records should be >= data.length",
    pagination.records >= admins.length,
  );
  TestValidator.predicate(
    "admins array should be non-empty for matching search term",
    admins.length > 0,
  );

  const foundPrimary = admins.find(
    (a) => a.id === primaryAdmin.id && a.email === primaryAdmin.email,
  );

  TestValidator.predicate(
    "listing should contain primary admin matching id and email",
    foundPrimary !== undefined,
  );

  if (admins.length > 0) {
    TestValidator.predicate(
      "pagination.pages should be at least 1 when data is non-empty",
      pagination.pages >= 1,
    );
  }

  // 8. Call listing with a non-matching search term and ensure primary admin is not returned
  const nonMatchingSearch = `nonexistent_${RandomGenerator.alphaNumeric(8)}`;

  const nonMatchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: nonMatchingSearch,
    status: null,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppTodoAdmin.IRequest;

  const nonMatchResult: IPageITodoAppTodoadmin.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.index(connection, {
      body: nonMatchRequestBody,
    });
  typia.assert(nonMatchResult);

  const nonMatchAdmins = nonMatchResult.data;

  const stillContainsPrimary = nonMatchAdmins.some(
    (a) => a.id === primaryAdmin.id && a.email === primaryAdmin.email,
  );

  TestValidator.predicate(
    "non-matching search should not return primary admin in results",
    !stillContainsPrimary,
  );
}
