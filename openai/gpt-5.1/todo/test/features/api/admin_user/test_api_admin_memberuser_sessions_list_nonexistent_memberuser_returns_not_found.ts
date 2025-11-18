import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { IPageITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserSession";

/**
 * Verify that listing sessions for a non-existent member user returns a
 * not-found error.
 *
 * Business context: Administrative users can inspect authentication sessions
 * for individual member users via PATCH
 * /todoApp/adminUser/memberUsers/{memberUserId}/sessions. When the target
 * member user does not exist, the backend should _not_ respond with a
 * successful empty page, but rather with a clear not-found style HTTP error
 * (typically 404) indicating that the target member user cannot be resolved.
 *
 * Scenario steps:
 *
 * 1. Join as an admin user using POST /auth/adminUser/join, which also configures
 *    Authorization on the shared `connection`.
 * 2. Optionally call PATCH /todoApp/adminUser/memberUsers with a broad
 *    ITodoAppMemberUser.IRequest to simulate a realistic environment and to
 *    demonstrate typical pagination usage (the specific ids are not used).
 * 3. Generate a random UUID to act as a fake memberUserId that we never create as
 *    a real member user.
 * 4. Call PATCH /todoApp/adminUser/memberUsers/{memberUserId}/sessions with a
 *    normal ITodoAppMemberUserSession.IRequest body (page/limit/orderBy) using
 *    that fake memberUserId.
 * 5. Assert via TestValidator.httpError that this call throws an HttpError with a
 *    not-found status code (404), proving the service rejects requests
 *    targeting non-existent member users instead of returning a successful
 *    empty list.
 */
export async function test_api_admin_memberuser_sessions_list_nonexistent_memberuser_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/",
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Optional: index member users with a simple request to demonstrate
  // pagination usage (response not used beyond type assertion).
  const memberUsersRequest = {
    page: 1,
    limit: 10,
    search: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppMemberUser.IRequest;

  const memberUsersPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: memberUsersRequest,
    });
  typia.assert(memberUsersPage);

  // 3. Generate a random UUID as a fake memberUserId that should not exist.
  const nonexistentMemberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare a normal sessions listing request body with sane pagination.
  const sessionsRequest = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ITodoAppMemberUserSession.IRequest;

  // 5. Assert that calling sessions.index with the non-existent memberUserId
  // results in an HTTP not-found style error (404).
  await TestValidator.httpError(
    "listing sessions for non-existent member user returns not-found error",
    404,
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.index(
        connection,
        {
          memberUserId: nonexistentMemberUserId,
          body: sessionsRequest,
        },
      );
    },
  );
}
