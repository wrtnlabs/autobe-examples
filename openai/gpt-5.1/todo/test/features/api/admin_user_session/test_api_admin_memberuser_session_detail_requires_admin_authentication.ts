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
 * Verify that admin-only member user session detail endpoint returns consistent
 * data for an authenticated admin user.
 *
 * Business goal: Ensure that GET
 * /todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId} works
 * correctly for a properly authenticated admin user and that the detailed
 * payload is consistent with the list endpoints.
 *
 * Revised scope (per global constraints):
 *
 * - We do NOT manipulate `connection.headers` or attempt to simulate
 *   unauthenticated/invalid-token requests directly, because header management
 *   is fully controlled by the SDK and must not be touched by tests.
 * - Instead, we focus on a full happy-path flow:
 *
 *   1. Create an admin account (POST /auth/adminUser/join) to obtain an authorized
 *        admin session and let the SDK configure the connection.
 *   2. As this admin, list member users (PATCH /todoApp/adminUser/memberUsers) and
 *        pick a real ITodoAppMemberUser.ISummary.
 *   3. For the chosen member user, list sessions via PATCH
 *        /todoApp/adminUser/memberUsers/{memberUserId}/sessions to obtain a
 *        real ITodoAppMemberUserSession.ISummary.
 *   4. Call the detail endpoint GET
 *        /todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId}
 *        using the same authenticated connection.
 *   5. Assert that the detail payload conforms to ITodoAppMemberUserSession and that
 *        IDs are consistent with the selected memberUserId and sessionId from
 *        the list results.
 */
export async function test_api_admin_memberuser_session_detail_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.local/" as string & tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, list member users to obtain a real memberUserId
  const memberUsersPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies ITodoAppMemberUser.IRequest,
    });
  typia.assert(memberUsersPage);

  const memberUser = memberUsersPage.data[0];
  TestValidator.predicate(
    "at least one member user exists",
    memberUser !== undefined,
  );
  if (!memberUser) return; // nothing to test if there is no member user

  const memberUserId = memberUser.id;

  // 3. List sessions for that member user to obtain a real sessionId
  const sessionsPage: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies ITodoAppMemberUserSession.IRequest,
      },
    );
  typia.assert(sessionsPage);

  const sessionSummary = sessionsPage.data[0];
  TestValidator.predicate(
    "at least one session exists for member user",
    sessionSummary !== undefined,
  );
  if (!sessionSummary) return; // cannot proceed without a session

  const sessionId = sessionSummary.id;

  // 4. Positive control: authorized admin connection can access session detail
  const sessionDetail: ITodoAppMemberUserSession =
    await api.functional.todoApp.adminUser.memberUsers.sessions.at(connection, {
      memberUserId,
      sessionId,
    });
  typia.assert(sessionDetail);

  TestValidator.equals(
    "session detail id should match selected session id",
    sessionDetail.id,
    sessionId,
  );

  TestValidator.equals(
    "session detail memberUser.id should match selected member user id",
    sessionDetail.memberUser.id,
    memberUserId,
  );
}
