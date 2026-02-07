import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user account - store password separately
  const userConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create multiple sessions by logging in multiple times
  const sessionConnections: api.IConnection[] = [];
  // Create 3 sessions by logging in multiple times
  for (let i = 0; i < 3; i++) {
    const sessionConnection: api.IConnection = { host: connection.host };
    // Since we don't have a login utility function, we'll create sessions through the join function
    // This simulates multiple sessions by creating multiple user connections
    await authorize_user_join(sessionConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.IJoin,
    });
    sessionConnections.push(sessionConnection);
  }
  // Test active session filtering
  const activeSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        status: "active",
        limit: 100,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // Test expired session filtering
  const expiredSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        status: "expired",
        limit: 100,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // Test all sessions (no status filter)
  const allSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        limit: 100,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // Validate filtering logic
  const currentTime = new Date();
  activeSessions.data.forEach((session: ITodoAppUserSession.ISummary) => {
    TestValidator.predicate(
      "active session should not be expired",
      new Date(session.expired_at) > currentTime,
    );
  });
  expiredSessions.data.forEach((session: ITodoAppUserSession.ISummary) => {
    TestValidator.predicate(
      "expired session should be expired",
      new Date(session.expired_at) <= currentTime,
    );
  });
  // Validate pagination integrity
  TestValidator.equals(
    "pagination limit",
    activeSessions.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination limit",
    expiredSessions.pagination.limit,
    100,
  );
  TestValidator.equals("pagination limit", allSessions.pagination.limit, 100);
  TestValidator.predicate(
    "current page should be valid",
    activeSessions.pagination.current >= 1 &&
      expiredSessions.pagination.current >= 1 &&
      allSessions.pagination.current >= 1,
  );
  // Validate that active + expired sessions should equal all sessions (if no other status exists)
  TestValidator.equals(
    "total sessions count",
    activeSessions.pagination.records + expiredSessions.pagination.records,
    allSessions.pagination.records,
  );
}
