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

/**
 * Test filtering sessions by active status.
 *
 * After joining, the user calls the sessions endpoint with is_active=true
 * filter to retrieve only active (non-expired) sessions. Validate that:
 * 1) All returned sessions have expired_at greater than the current timestamp,
 * 2) The is_active computed filter correctly identifies active vs expired sessions,
 * 3) Pagination works correctly with the active filter applied.
 * Then test with is_active=false to retrieve expired sessions and verify the
 * inverse logic.
 */
export async function test_api_user_session_list_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Test filtering for active sessions (is_active=true)
  const activeSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        is_active: true,
        limit: 10,
        page: 1,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // Validate pagination works correctly with active filter
  TestValidator.predicate(
    "active sessions pagination has valid current page",
    activeSessions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "active sessions pagination has valid limit",
    activeSessions.pagination.limit >= 0,
  );
  // Validate all active sessions have expired_at greater than current timestamp
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "active session has expired_at in the future",
      expiredAt > now,
    );
  }
  // 3. Test filtering for expired sessions (is_active=false)
  const expiredSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        is_active: false,
        limit: 10,
        page: 1,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // Validate pagination works correctly with expired filter
  TestValidator.predicate(
    "expired sessions pagination has valid current page",
    expiredSessions.pagination.current >= 0,
  );
  // Validate all expired sessions have expired_at less than or equal to current timestamp
  // Note: Since we just created this session, there should be no expired sessions
  // But if there are, they must have expired_at <= now
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "expired session has expired_at in the past",
      expiredAt <= now,
    );
  }
}
