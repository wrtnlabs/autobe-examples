import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

/**
 * Admin can filter a todoUser's authentication sessions by active/expired
 * status.
 *
 * Business goal:
 *
 * - Verify that the admin sessions listing endpoint honours the `isActive` filter
 *   flag in `ITodoAppTodouserSession.IRequest`.
 * - Ensure that all records are scoped to the specified `todoUserId` and that
 *   active vs expired sessions are correctly distinguished using `expired_at`.
 *
 * Scenario steps:
 *
 * 1. Register a new todoAdmin using /auth/todoAdmin/join, letting the SDK attach
 *    the admin Authorization token to the shared `connection`.
 * 2. Register a new todoUser using /auth/todoUser/join, capturing the created
 *    user's id from ITodoAppTodoUser.IAuthorized.
 * 3. Perform two separate logins as the todoUser via /auth/todoUser/login so that
 *    at least two session records exist for this user.
 * 4. As the admin (connection now holding admin token), call PATCH
 *    /todoApp/todoAdmin/todoUsers/{todoUserId}/sessions with `isActive: true`
 *    and explicit pagination fields.
 * 5. Assert that:
 *
 *    - Response type matches IPageITodoAppTodouserSession.ISummary.
 *    - All `data` entries have `todoUser.id` equal to the registered todoUser's id.
 *    - All `data` entries have `expired_at === null` (active sessions).
 * 6. Call the same endpoint with `isActive: false` to fetch inactive sessions for
 *    the same todoUser.
 * 7. Assert that:
 *
 *    - All `data` entries (if any) have `todoUser.id` equal to the user id.
 *    - All `data` entries have `expired_at !== null` (expired sessions).
 *    - If there are no expired sessions, the pagination.records is 0 and `data` is
 *         an empty array, which is still considered a success case.
 */
export async function test_api_todo_admin_filter_active_sessions_only(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain admin token
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "admin-password",
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a new todoUser
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const todoUserJoinBody = {
    email: userEmail,
    password: "user-password" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // Capture the todoUserId for later admin queries
  const todoUserId: string & tags.Format<"uuid"> = todoUserAuthorized.id;

  // 3. Perform at least two logins as the todoUser to create multiple sessions
  const loginBodyBase = {
    email: userEmail,
    password: "user-password",
    ip: null,
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const firstLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginBodyBase,
    });
  typia.assert(firstLogin);

  const secondLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginBodyBase,
    });
  typia.assert(secondLogin);

  // 4. Admin queries active sessions for the todoUser
  // The connection currently holds the todoUser token after login calls.
  // Rejoin admin to ensure we have an admin token for privileged endpoint.
  const adminRejoin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminRejoin);

  const activeRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    isActive: true,
    createdFrom: undefined,
    createdTo: undefined,
    expiredFrom: undefined,
    expiredTo: undefined,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies ITodoAppTodouserSession.IRequest;

  const activePage: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.sessions.index(
      connection,
      {
        todoUserId,
        body: activeRequestBody,
      },
    );
  typia.assert(activePage);

  // 5. Validate that all returned sessions are active and belong to the user
  TestValidator.predicate(
    "active sessions pagination records non-negative",
    activePage.pagination.records >= 0,
  );

  for (const session of activePage.data) {
    typia.assert<ITodoAppTodouserSession.ISummary>(session);
    TestValidator.equals(
      "active session belongs to requested todoUser",
      session.todoUser.id,
      todoUserId,
    );
    TestValidator.equals(
      "active session expired_at must be null",
      session.expired_at ?? null,
      null,
    );
  }

  // 6. Admin queries inactive (expired) sessions for the same todoUser
  const inactiveRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    isActive: false,
    createdFrom: undefined,
    createdTo: undefined,
    expiredFrom: undefined,
    expiredTo: undefined,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies ITodoAppTodouserSession.IRequest;

  const inactivePage: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoUsers.sessions.index(
      connection,
      {
        todoUserId,
        body: inactiveRequestBody,
      },
    );
  typia.assert(inactivePage);

  // 7. Validate inactive sessions behaviour.
  if (inactivePage.pagination.records === 0) {
    TestValidator.equals(
      "no inactive sessions implies empty data array",
      inactivePage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "inactive sessions pagination records positive",
      inactivePage.pagination.records > 0,
    );
  }

  for (const session of inactivePage.data) {
    typia.assert<ITodoAppTodouserSession.ISummary>(session);
    TestValidator.equals(
      "inactive session belongs to requested todoUser",
      session.todoUser.id,
      todoUserId,
    );
    TestValidator.predicate(
      "inactive session expired_at must be non-null",
      session.expired_at !== null && session.expired_at !== undefined,
    );
  }
}
