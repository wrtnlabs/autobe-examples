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

export async function test_api_admin_memberuser_session_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user via /auth/adminUser/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: null,
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/auth/join",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Search for member users with a small page to get at least one user
  const memberSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ITodoAppMemberUser.IRequest;

  const memberPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: memberSearchRequest,
    });
  typia.assert(memberPage);

  // Ensure that there's at least one member user to work with
  TestValidator.predicate(
    "member user list should not be empty",
    memberPage.data.length > 0,
  );

  const memberSummary: ITodoAppMemberUser.ISummary = memberPage.data[0];
  const memberUserId = memberSummary.id;

  // 3. List sessions for the selected member user (page=1, small limit)
  const sessionListRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies ITodoAppMemberUserSession.IRequest;

  const sessionPage: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId,
        body: sessionListRequest,
      },
    );
  typia.assert(sessionPage);

  // Sanity check: pagination should reflect requested page and limit
  TestValidator.equals(
    "session page current should be 1",
    sessionPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "session page limit should be 5",
    sessionPage.pagination.limit,
    5,
  );

  // Ensure that there is at least one session for the member user
  TestValidator.predicate(
    "member user session list should not be empty",
    sessionPage.data.length > 0,
  );

  const sessionSummary: ITodoAppMemberUserSession.ISummary =
    sessionPage.data[0];

  // 4. Retrieve session detail for the chosen session
  const sessionDetail: ITodoAppMemberUserSession =
    await api.functional.todoApp.adminUser.memberUsers.sessions.at(connection, {
      memberUserId,
      sessionId: sessionSummary.id,
    });
  typia.assert(sessionDetail);

  // 5. Validate that the memberUser in detail matches path and summary
  TestValidator.equals(
    "detail.memberUser.id matches path memberUserId",
    sessionDetail.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "detail.memberUser.id matches summary.memberUser.id",
    sessionDetail.memberUser.id,
    sessionSummary.memberUser.id,
  );

  // 6. Compare key fields between summary and detail for consistency
  TestValidator.equals(
    "session id matches between summary and detail",
    sessionDetail.id,
    sessionSummary.id,
  );
  TestValidator.equals(
    "session ip matches between summary and detail",
    sessionDetail.ip,
    sessionSummary.ip,
  );
  TestValidator.equals(
    "session href matches between summary and detail",
    sessionDetail.href,
    sessionSummary.href,
  );
  TestValidator.equals(
    "session referrer matches between summary and detail",
    sessionDetail.referrer,
    sessionSummary.referrer,
  );
  TestValidator.equals(
    "session created_at matches between summary and detail",
    sessionDetail.created_at,
    sessionSummary.created_at,
  );
  TestValidator.equals(
    "session expired_at matches between summary and detail",
    sessionDetail.expired_at,
    sessionSummary.expired_at ?? null,
  );
}
