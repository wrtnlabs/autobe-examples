import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserSession";

/**
 * Verify that listing member user sessions requires admin authentication and
 * works with a valid admin token.
 *
 * Business goal:
 *
 * - Ensure that the administrative session listing endpoint PATCH
 *   /todoApp/adminUser/memberUsers/{memberUserId}/sessions cannot be called
 *   anonymously.
 * - Confirm that, once an admin user has joined (and thus is authenticated), the
 *   same endpoint can be called successfully and returns data matching
 *   IPageITodoAppMemberUserSession.ISummary.
 *
 * Scenario rewrite and constraints:
 *
 * - We cannot manipulate connection.headers directly; instead we construct a
 *   derived unauthenticated connection with headers: {}.
 * - We do not have a dedicated member user factory, so we use a random UUID for
 *   memberUserId; backend behavior for unknown member users is not asserted
 *   here beyond type-level success.
 * - HTTP status codes are not asserted explicitly; instead we only assert that
 *   unauthenticated calls fail (throw) and authenticated calls succeed.
 */
export async function test_api_admin_memberuser_sessions_list_requires_admin_authentication(
  connection: api.IConnection,
) {
  // Use a fixed (but random) member user id for all calls in this test.
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Base request body for listing sessions
  const requestBody: ITodoAppMemberUserSession.IRequest =
    typia.random<ITodoAppMemberUserSession.IRequest>();

  // 1. Build an unauthenticated connection (no headers at all).
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. First unauthenticated call must fail.
  await TestValidator.error(
    "unauthenticated admin member user sessions listing should fail (first attempt)",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.index(
        unauthConn,
        {
          memberUserId,
          body: requestBody,
        },
      );
    },
  );

  // 3. Second unauthenticated call (representing missing/invalid token) must also fail.
  const secondRequestBody: ITodoAppMemberUserSession.IRequest =
    typia.random<ITodoAppMemberUserSession.IRequest>();

  await TestValidator.error(
    "unauthenticated admin member user sessions listing should fail (second attempt)",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.index(
        unauthConn,
        {
          memberUserId,
          body: secondRequestBody,
        },
      );
    },
  );

  // 4. Positive control: join as admin to obtain a valid admin token.
  const joinBody = typia.random<ITodoAppAdminUser.IJoin>();

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 5. Authenticated call: with the admin token, sessions listing should succeed.
  const authedRequestBody: ITodoAppMemberUserSession.IRequest =
    typia.random<ITodoAppMemberUserSession.IRequest>();

  const authedResult: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId,
        body: authedRequestBody,
      },
    );
  typia.assert<IPageITodoAppMemberUserSession.ISummary>(authedResult);
}
