import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session filtering by status (active vs expired).
 *
 * Validates that members can correctly filter their authentication sessions by expiration status. The test verifies that the API properly separates active sessions (not yet expired) from expired sessions (past expiration time) when querying the session list.
 *
 * Special attention is given to ensuring that:
 * - Active sessions have is_active = true and expired_at in the future
 * - Expired sessions have is_active = false and expired_at in the past
 * - Pagination metadata is correctly maintained for filtered results
 * - Session summaries contain all required fields with proper formatting
 *
 * 1. Member registers and authenticates to create initial session.
 * 2. Member queries sessions with status='active' filter.
 * 3. Validates all returned sessions have is_active = true.
 * 4. Member queries sessions with status='expired' filter.
 * 5. Validates all returned sessions have is_active = false (if any exist).
 * 6. Confirms pagination metadata is present in both responses.
 */
export async function test_api_member_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Query active sessions
  const activeSessions =
    await api.functional.todoApp.member.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies ITodoAppMemberSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 3. Validate active sessions
  TestValidator.equals(
    "active sessions pagination present",
    activeSessions.pagination.current,
    1,
  );
  TestValidator.predicate("all active sessions are active", () =>
    activeSessions.data.every((session) => session.is_active === true),
  );
  activeSessions.data.forEach((session) => {
    typia.assert(session);
    TestValidator.predicate(
      `session ${session.id} has future expiration`,
      () => new Date(session.expired_at).getTime() > Date.now(),
    );
  });
  // 4. Query expired sessions
  const expiredSessions =
    await api.functional.todoApp.member.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 100,
        } satisfies ITodoAppMemberSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // 5. Validate expired sessions
  TestValidator.equals(
    "expired sessions pagination present",
    expiredSessions.pagination.current,
    1,
  );
  TestValidator.predicate("all expired sessions are inactive", () =>
    expiredSessions.data.every((session) => session.is_active === false),
  );
  expiredSessions.data.forEach((session) => {
    typia.assert(session);
    TestValidator.predicate(
      `session ${session.id} has past expiration`,
      () => new Date(session.expired_at).getTime() < Date.now(),
    );
  });
  // 6. Verify pagination metadata structure
  TestValidator.predicate(
    "active sessions has valid pagination",
    () =>
      activeSessions.pagination.records >= 0 &&
      activeSessions.pagination.limit >= 0 &&
      activeSessions.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "expired sessions has valid pagination",
    () =>
      expiredSessions.pagination.records >= 0 &&
      expiredSessions.pagination.limit >= 0 &&
      expiredSessions.pagination.pages >= 0,
  );
}
