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
 * Basic pagination and scoping test for member user session listing.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin user can list sessions for a particular
 *   member user via PATCH
 *   /todoApp/adminUser/memberUsers/{memberUserId}/sessions.
 * - Verify that pagination parameters (page, limit) from the request are
 *   reflected in the response pagination block.
 * - Verify that each returned session summary belongs to the requested member
 *   user.
 *
 * High-level workflow
 *
 * 1. Register a fresh admin user with /auth/adminUser/join. The SDK will
 *    automatically store the access token in connection.headers so that
 *    subsequent todoApp adminUser endpoints are authorized.
 * 2. Search member users with /todoApp/adminUser/memberUsers using a simple filter
 *    (first page, small limit) to obtain at least one member user summary (or
 *    an empty page when there are no members).
 * 3. If there is at least one member user, pick the first one and request its
 *    sessions using /todoApp/adminUser/memberUsers/{memberUserId}/sessions with
 *    ITodoAppMemberUserSession.IRequest specifying page and limit.
 * 4. Assert that the response matches IPageITodoAppMemberUserSession.ISummary and
 *    that:
 *
 *    - Pagination.current equals the requested page
 *    - Pagination.limit equals the requested limit
 *    - Every item in data has memberUser.id equal to the selected member user id
 * 5. If there are no member users, the test still passes by simply asserting the
 *    member user list page shape and skipping the session listing call (since
 *    there is no concrete member user to inspect).
 */
export async function test_api_admin_memberuser_sessions_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register an admin user and get authorized context
  const joinBody = {
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
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Search for member users with a small page size
  const memberPageParam = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const memberLimitParam = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const memberUserRequest = {
    page: memberPageParam,
    limit: memberLimitParam,
  } satisfies ITodoAppMemberUser.IRequest;

  const memberPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: memberUserRequest,
    });
  typia.assert<IPageITodoAppMemberUser.ISummary>(memberPage);

  // Basic pagination echo assertions on member user list
  TestValidator.equals(
    "member user list - pagination.current should echo requested page",
    memberPage.pagination.current,
    memberUserRequest.page,
  );
  TestValidator.equals(
    "member user list - pagination.limit should echo requested limit",
    memberPage.pagination.limit,
    memberUserRequest.limit,
  );

  if (memberPage.data.length === 0) {
    // No member users to inspect. Test passes after verifying basic shape.
    TestValidator.equals(
      "member user list can be empty when there are no members",
      memberPage.pagination.records,
      0,
    );
    return;
  }

  // 3. Pick the first member user to inspect sessions
  const targetMember: ITodoAppMemberUser.ISummary = memberPage.data[0];
  typia.assert<ITodoAppMemberUser.ISummary>(targetMember);

  const sessionPageParam = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const sessionLimitParam = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const sessionRequest = {
    page: sessionPageParam,
    limit: sessionLimitParam,
  } satisfies ITodoAppMemberUserSession.IRequest;

  const sessionsPage: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: targetMember.id,
        body: sessionRequest,
      },
    );
  typia.assert<IPageITodoAppMemberUserSession.ISummary>(sessionsPage);

  // 4. Assert pagination echo for sessions listing
  TestValidator.equals(
    "sessions list - pagination.current should echo requested page",
    sessionsPage.pagination.current,
    sessionRequest.page,
  );
  TestValidator.equals(
    "sessions list - pagination.limit should echo requested limit",
    sessionsPage.pagination.limit,
    sessionRequest.limit,
  );

  // 5. Validate each session summary belongs to the selected member user
  for (const session of sessionsPage.data) {
    typia.assert<ITodoAppMemberUserSession.ISummary>(session);
    TestValidator.equals(
      "every session summary must belong to the requested member user",
      session.memberUser.id,
      targetMember.id,
    );
  }
}
