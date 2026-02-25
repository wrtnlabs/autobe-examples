import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for session testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Login to create sessions
  const loginConnection: api.IConnection = { host: connection.host };
  const firstSession = await authorize_super_admin_login(loginConnection, {
    body: {
      email: superAdmin.email,
      password: "",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(firstSession);
  // 3. Create second session with different parameters
  await new Promise((resolve) => setTimeout(resolve, 100));
  const secondSession = await authorize_super_admin_login(
    { ...loginConnection, headers: { ...loginConnection.headers } },
    {
      body: {
        email: superAdmin.email,
        password: "",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(secondSession);
  // 4. Test session filtering by active status
  const activeFilter: IDiscussionBoardSuperAdminSession.IRequest = {
    active: true,
    page: 1,
    limit: 10,
  };
  const activeSessions =
    await api.functional.discussionBoard.superAdmin.sessions.index(connection, {
      body: activeFilter,
    });
  typia.assert(activeSessions);
  TestValidator.equals(
    "has active sessions",
    activeSessions.data.length > 0,
    true,
  );
  // 5. Test session filtering by date range
  const dateRangeFilter: IDiscussionBoardSuperAdminSession.IRequest = {
    created_at_from: new Date().toISOString(),
    page: 1,
    limit: 10,
  };
  const dateFiltered =
    await api.functional.discussionBoard.superAdmin.sessions.index(connection, {
      body: dateRangeFilter,
    });
  typia.assert(dateFiltered);
  // 6. Test IP address filtering
  const ipFilter: IDiscussionBoardSuperAdminSession.IRequest = {
    ip: "127.0.0",
    page: 1,
    limit: 10,
  };
  const ipFiltered =
    await api.functional.discussionBoard.superAdmin.sessions.index(connection, {
      body: ipFilter,
    });
  typia.assert(ipFiltered);
  // 7. Test user agent filtering
  const userAgentFilter: IDiscussionBoardSuperAdminSession.IRequest = {
    user_agent: "Mozilla",
    page: 1,
    limit: 10,
  };
  const userAgentFiltered =
    await api.functional.discussionBoard.superAdmin.sessions.index(connection, {
      body: userAgentFilter,
    });
  typia.assert(userAgentFiltered);
  // 8. Test comprehensive filter combination
  const comprehensiveFilter: IDiscussionBoardSuperAdminSession.IRequest = {
    active: true,
    created_at_from: new Date(Date.now() - 3600000).toISOString(), // Last hour
    ip: "127.0.0",
    user_agent: "Mozilla",
    page: 1,
    limit: 50,
  };
  const comprehensiveFiltered =
    await api.functional.discussionBoard.superAdmin.sessions.index(connection, {
      body: comprehensiveFilter,
    });
  typia.assert(comprehensiveFiltered);
  // 9. Test pagination with large result set
  const paginationTest: IDiscussionBoardSuperAdminSession.IRequest = {
    page: 1,
    limit: 25,
  };
  const paginated =
    await api.functional.discussionBoard.superAdmin.sessions.index(connection, {
      body: paginationTest,
    });
  typia.assert(paginated);
  TestValidator.predicate(
    "has pagination metadata",
    paginated.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginated.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    paginated.pagination.records >= 0,
  );
  // 10. Verify session data structure
  if (paginated.data.length > 0) {
    const sampleSession = paginated.data[0];
    TestValidator.equals(
      "session has ID",
      typeof sampleSession.id === "string",
      true,
    );
    TestValidator.equals(
      "session has super_admin_id",
      typeof sampleSession.super_admin_id === "string",
      true,
    );
    TestValidator.equals(
      "session has IP address",
      typeof sampleSession.ip === "string",
      true,
    );
    TestValidator.equals(
      "session has active status",
      typeof sampleSession.active === "boolean",
      true,
    );
    TestValidator.equals(
      "session has timestamps",
      typeof sampleSession.created_at === "string",
      true,
    );
    TestValidator.equals(
      "session has superAdmin",
      sampleSession.superAdmin !== null,
      true,
    );
  }
}
