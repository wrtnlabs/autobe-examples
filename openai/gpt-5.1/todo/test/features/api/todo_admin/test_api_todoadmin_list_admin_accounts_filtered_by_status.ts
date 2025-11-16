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
 * Verify that the admin listing endpoint correctly filters administrator
 * accounts by lifecycle status and that pagination metadata reflects the
 * filtered result set.
 *
 * Business context:
 *
 * - Admin operators (todoAdmin) need to search and list other admin accounts.
 * - The listing endpoint supports filtering by lifecycle status (e.g., "active",
 *   "suspended").
 * - The response is a paginated collection of ITodoAppTodoAdmin.ISummary with
 *   IPage.IPagination metadata.
 *
 * Test workflow (single E2E scenario):
 *
 * 1. Create two todoAdmin accounts via /auth/todoAdmin/join with distinct emails.
 *    The backend initializes their lifecycle status (likely "active" by
 *    default).
 * 2. Authenticate as the first admin (using login) so subsequent calls run in an
 *    admin context.
 * 3. Create at least one Todo status via /todoApp/todoAdmin/todoStatuses to
 *    simulate realistic configuration.
 * 4. Create a todoUser via /auth/todoUser/join and a Todo via
 *    /todoApp/todoUser/todos to simulate business data existing in the system;
 *    this does not affect the admin listing directly, but ensures realistic
 *    environment.
 * 5. Call PATCH /todoApp/todoAdmin/todoAdmins with status filter equal to a known
 *    status value (e.g., "active"), and a small pagination limit (e.g., 10).
 * 6. Assert that:
 *
 *    - The response type matches IPageITodoAppTodoadmin.ISummary via typia.assert.
 *    - Every ITodoAppTodoAdmin.ISummary in data has status === requested status.
 *    - At least one admin is returned when using a status that matches created
 *         admins.
 *    - Pagination metadata (pagination.records and pagination.pages) is consistent
 *         with the size of data for the requested page (e.g., records >=
 *         data.length, pages >= 1, current and limit non-negative).
 * 7. Optionally, perform a second call with a different status filter value that
 *    is unlikely to match (e.g., "suspended") and assert that data is empty and
 *    pagination.records is 0 or at least coherent with zero matches.
 *
 * Constraints and notes:
 *
 * - We do not have an explicit API to mutate admin status after creation, so we
 *   rely on whatever status the backend assigns (commonly "active") and filter
 *   using that value.
 * - We must use the concrete DTO types: ITodoAppTodoAdmin.IRequest as the body
 *   for the listing call, and IPageITodoAppTodoadmin.ISummary as the response
 *   type.
 * - We must not touch connection.headers directly; authentication is handled
 *   automatically by join/login SDKs.
 */
export async function test_api_todoadmin_list_admin_accounts_filtered_by_status(
  connection: api.IConnection,
) {
  // 1. Register two todoAdmin accounts with different emails
  const adminJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin1: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody1,
    });
  typia.assert(admin1);

  const admin2: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody2,
    });
  typia.assert(admin2);

  // 2. Authenticate explicitly as the first admin (login), even though join already authenticates,
  //    to exercise login flow and ensure admin context is active.
  const adminLoginBody = {
    email: admin1.email,
    password: adminJoinBody1.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create a Todo status to ensure configuration exists
  const todoStatusBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: null,
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const todoStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusBody,
    });
  typia.assert(todoStatus);

  // 4. Create a todoUser and a Todo for realistic environment
  const todoUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUser);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 5. Call admin listing endpoint with a known status filter (admin1.status)
  const targetStatus: string = admin1.status;

  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    status: targetStatus,
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

  // Basic sanity checks on pagination
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

  // Assert that all returned admins match the status filter
  for (const summary of admins) {
    TestValidator.equals(
      "admin summary status matches filter",
      summary.status,
      targetStatus,
    );
  }

  // Ensure at least one admin is returned for the known status when possible
  TestValidator.predicate(
    "at least one admin with target status should be returned (including the ones we created)",
    admins.length >= 1,
  );

  // 6. Optionally test a different status filter that likely yields zero results
  const unlikelyStatus = `${targetStatus}_NON_EXISTENT`; // unlikely to exist

  const listRequestBodyUnlikely = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: null,
    status: unlikelyStatus,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppTodoAdmin.IRequest;

  const pageResultUnlikely: IPageITodoAppTodoadmin.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.index(connection, {
      body: listRequestBodyUnlikely,
    });
  typia.assert(pageResultUnlikely);

  TestValidator.equals(
    "no admins should match unlikely status filter",
    pageResultUnlikely.data.length,
    0,
  );

  TestValidator.predicate(
    "pagination records for unlikely status is coherent (>= data length)",
    pageResultUnlikely.pagination.records >= pageResultUnlikely.data.length,
  );
}
