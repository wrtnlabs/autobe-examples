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

export async function test_api_admin_memberuser_session_detail_wrong_memberuserid_yields_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin user and establish admin authentication context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. List member users as admin to obtain at least one (ideally two) member users
  const memberUsersPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: undefined,
        status: undefined,
        created_from: undefined,
        created_to: undefined,
        order_by: undefined,
        order_direction: undefined,
      } satisfies ITodoAppMemberUser.IRequest,
    });
  typia.assert(memberUsersPage);

  const memberUsers: ITodoAppMemberUser.ISummary[] = memberUsersPage.data;

  await TestValidator.predicate(
    "at least one member user must exist",
    async () => {
      return memberUsers.length >= 1;
    },
  );

  const memberUserA: ITodoAppMemberUser.ISummary = memberUsers[0];

  // Choose B if available; otherwise create a fake UUID
  let memberUserBId: string & tags.Format<"uuid">;
  if (memberUsers.length >= 2) {
    const memberUserB: ITodoAppMemberUser.ISummary = memberUsers[1];
    memberUserBId = memberUserB.id;
  } else {
    memberUserBId = typia.random<string & tags.Format<"uuid">>();
  }

  // 3. List sessions for member user A
  const sessionsPageForA: IPageITodoAppMemberUserSession.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: memberUserA.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: undefined,
          orderDirection: undefined,
        } satisfies ITodoAppMemberUserSession.IRequest,
      },
    );
  typia.assert(sessionsPageForA);

  const sessionsOfA: ITodoAppMemberUserSession.ISummary[] =
    sessionsPageForA.data;

  await TestValidator.predicate(
    "at least one session must exist for member user A",
    async () => sessionsOfA.length >= 1,
  );

  const sessionSummaryA: ITodoAppMemberUserSession.ISummary = sessionsOfA[0];
  const sessionIdA: string & tags.Format<"uuid"> = sessionSummaryA.id;

  // 4. Control case: correct pair (A.id, sessionIdA) should succeed
  const sessionDetailForA: ITodoAppMemberUserSession =
    await api.functional.todoApp.adminUser.memberUsers.sessions.at(connection, {
      memberUserId: memberUserA.id,
      sessionId: sessionIdA,
    });
  typia.assert(sessionDetailForA);

  TestValidator.equals(
    "session detail should correspond to member user A",
    sessionDetailForA.memberUser.id,
    memberUserA.id,
  );

  TestValidator.equals(
    "session detail id should match sessionIdA",
    sessionDetailForA.id,
    sessionIdA,
  );

  // 5. Negative case: mismatched memberUserId and sessionId should yield 404
  await TestValidator.httpError(
    "mismatched memberUserId and sessionId yields 404",
    404,
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.at(
        connection,
        {
          memberUserId: memberUserBId,
          sessionId: sessionIdA,
        },
      );
    },
  );
}
