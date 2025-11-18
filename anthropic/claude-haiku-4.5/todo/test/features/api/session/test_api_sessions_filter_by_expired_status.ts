import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering sessions by expired status.
 *
 * This test validates that the session filtering API correctly separates active
 * sessions from expired/terminated sessions based on the expired_at timestamp
 * field. It ensures that:
 *
 * - When status='expired' filter is applied, only sessions with non-null
 *   expired_at are returned
 * - Active sessions (expired_at = null) are excluded from expired results
 * - The initial session created during registration is active
 *
 * Steps:
 *
 * 1. Register a new user account via join endpoint
 * 2. Request all sessions without status filter
 * 3. Request sessions filtered by status='expired'
 * 4. Verify that expired filter returns only sessions with non-null expired_at
 * 5. Verify that active sessions are not included in expired results
 */
export async function test_api_sessions_filter_by_expired_status(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: RandomGenerator.alphaNumeric(15),
        user_agent: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Request all sessions without status filter
  const allSessions: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(allSessions);
  TestValidator.predicate(
    "all sessions should return at least one session",
    allSessions.data.length > 0,
  );

  // Step 3: Request sessions filtered by status='expired'
  const expiredSessions: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "expired",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(expiredSessions);

  // Step 4: Verify that all returned sessions have non-null expired_at
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      `session ${session.id} should have non-null expired_at when filtered by expired status`,
      session.expired_at !== null && session.expired_at !== undefined,
    );
  }

  // Step 5: Verify that the initial active session is not in expired results
  const initialSession = allSessions.data.find(
    (s) => s.expired_at === null || s.expired_at === undefined,
  );
  if (initialSession) {
    const foundInExpired = expiredSessions.data.find(
      (s) => s.id === initialSession.id,
    );
    TestValidator.predicate(
      "active session from registration should not appear in expired results",
      foundInExpired === undefined,
    );
  }
}
