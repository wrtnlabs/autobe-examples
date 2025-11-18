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
 * Verify that requesting a member user session detail with a non-existent
 * sessionId results in an error for an otherwise valid member user and
 * authenticated admin.
 *
 * Business context:
 *
 * - Admin operators can inspect member user authentication sessions via
 *   /todoApp/adminUser/memberUsers/{memberUserId}/sessions and the detail
 *   endpoint
 *   /todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId}.
 * - When a sessionId does not exist (or does not belong to the specified member
 *   user), the detail endpoint must fail with a not-found style error without
 *   leaking other session information.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin using POST /auth/adminUser/join.
 * 2. Query member users via PATCH /todoApp/adminUser/memberUsers and obtain a
 *    valid memberUserId from the first page.
 * 3. List that member user's sessions via PATCH
 *    /todoApp/adminUser/memberUsers/{memberUserId}/sessions and collect their
 *    ids.
 * 4. Generate a random UUID that is not currently used as a session id for that
 *    member user.
 * 5. Call GET /todoApp/adminUser/memberUsers/{memberUserId}/sessions/{sessionId}
 *    with the non-existent sessionId and assert that the call fails.
 */
export async function test_api_admin_memberuser_session_detail_nonexistent_session_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Fetch a page of member users to obtain a valid memberUserId
  const memberUsersRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ITodoAppMemberUser.IRequest;

  const memberUsersPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: memberUsersRequestBody,
    });
  typia.assert(memberUsersPage);

  // Ensure there is at least one member user available for this test
  await TestValidator.predicate(
    "at least one member user must exist for the not-found session detail test",
    async () => memberUsersPage.data.length > 0,
  );
  if (memberUsersPage.data.length === 0) return;

  const targetMemberUser = memberUsersPage.data[0];
  typia.assert<ITodoAppMemberUser.ISummary>(targetMemberUser);

  // 3. List sessions for the chosen member user
  const sessionsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ITodoAppMemberUserSession.IRequest;

  const sessionsPage: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: targetMemberUser.id,
        body: sessionsRequestBody,
      },
    );
  typia.assert(sessionsPage);

  const existingSessionIds = new Set<string>();
  for (const summary of sessionsPage.data) {
    existingSessionIds.add(summary.id);
  }

  // 4. Generate a UUID that is not in the existing sessions for this member user
  let nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  for (let i = 0; i < 5; i++) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (!existingSessionIds.has(candidate)) {
      nonExistentSessionId = candidate;
      break;
    }
  }

  // 5. Call the detail endpoint with the non-existent sessionId and expect error
  await TestValidator.error(
    "requesting a non-existent member user session detail should result in an error",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.at(
        connection,
        {
          memberUserId: targetMemberUser.id,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
