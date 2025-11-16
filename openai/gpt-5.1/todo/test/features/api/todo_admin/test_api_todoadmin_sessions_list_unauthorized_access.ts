import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoadminSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminSession";

/**
 * Validate that the todoAdmin sessions listing endpoint cannot be accessed
 * without proper todoAdmin authentication, while confirming that it works
 * correctly for an authenticated admin.
 *
 * Business flow:
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join, letting the SDK configure
 *    the Authorization header on the shared connection.
 * 2. With the authenticated connection, call the sessions index endpoint for that
 *    admin and verify that a paginated sessions page is returned and that all
 *    returned sessions belong to the same admin id.
 * 3. Create a separate unauthenticated connection object with empty headers using
 *    object spread, without touching connection.headers directly.
 * 4. Using the unauthenticated connection, attempt to call the sessions index
 *    endpoint for the real admin id and verify that the call fails (throws).
 * 5. Repeat the unauthenticated call using a random UUID as todoAdminId to confirm
 *    that a valid-looking admin id is still rejected without authentication.
 */
export async function test_api_todoadmin_sessions_list_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register (join) a new todoAdmin, which also sets Authorization header
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Authorized sessions listing for the joined admin
  const authorizedRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies ITodoAppTodoAdminSession.IRequest;

  const authorizedSessions: IPageITodoAppTodoadminSession.ISummary =
    await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
      connection,
      {
        todoAdminId: admin.id,
        body: authorizedRequestBody,
      },
    );
  typia.assert<IPageITodoAppTodoadminSession.ISummary>(authorizedSessions);

  // Ensure that all returned sessions, if any, belong to the same admin id
  await TestValidator.predicate(
    "all sessions in authorized listing belong to the joined admin",
    async () => {
      const allMatch: boolean = authorizedSessions.data.every((session) => {
        return session.todoAdmin.id === admin.id;
      });
      return allMatch;
    },
  );

  // 3. Create an unauthenticated connection by resetting headers via spread
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Reuse a minimal but valid request body (can even be empty since all fields
  // are optional, but we explicitly set page/limit for clarity)
  const minimalRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
  } satisfies ITodoAppTodoAdminSession.IRequest;

  // 4. Attempt to list sessions without authentication for the real admin id
  await TestValidator.error(
    "unauthenticated connection must not list sessions for real admin id",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
        unauthenticatedConnection,
        {
          todoAdminId: admin.id,
          body: minimalRequestBody,
        },
      );
    },
  );

  // 5. Attempt to list sessions without authentication using a random UUID
  const randomAdminId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthenticated connection must not list sessions for random admin id",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.sessions.index(
        unauthenticatedConnection,
        {
          todoAdminId: randomAdminId,
          body: minimalRequestBody,
        },
      );
    },
  );
}
