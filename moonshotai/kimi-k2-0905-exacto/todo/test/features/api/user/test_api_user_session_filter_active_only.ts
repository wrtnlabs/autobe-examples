import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test filtering session search to return only currently active sessions.
 *
 * Validates the filtering mechanism that distinguishes between active and
 * expired sessions, allowing users to monitor current account access patterns
 * for security awareness.
 *
 * This test creates a user account, generates multiple sessions through
 * multiple login attempts, and then tests the filtering functionality to ensure
 * only active sessions are returned.
 *
 * 1. Create user account for authentication
 * 2. Create multiple sessions by logging in multiple times
 * 3. Test session filtering with expired_at: null to get only active sessions
 * 4. Validate that filtered results contain only active sessions
 * 5. Verify pagination works correctly with filtered results
 */
export async function test_api_user_session_filter_active_only(
  connection: api.IConnection,
) {
  // Step 1: Create user account
  const email1: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const user1: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email1,
        password: "testpassword123",
        href: "https://example.com/login",
        referrer: "https://example.com/register",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user1);

  // Step 2: Create multiple sessions by logging in multiple times
  const sessionCount = 3;
  const sessions: ITodoAppUser.IAuthorized[] = [];

  for (let i = 0; i < sessionCount; i++) {
    const user = await api.functional.auth.user.login(connection, {
      body: {
        email: email1,
        password: "testpassword123",
        href: "https://example.com/login",
        referrer: "https://example.com/landing",
      } satisfies ITodoAppUser.ILogin,
    });
    typia.assert(user);
    sessions.push(user);
  }

  // Step 3: Test session filtering with expired_at: null for active sessions
  const activeSessions = await api.functional.todoApp.user.auth.sessions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        expired_at: null, // Filter for only active sessions
      } satisfies ITodoAppUserSession.IRequest,
    },
  );

  typia.assert(activeSessions);

  // Step 4: Validate that filtered results contain only active sessions
  TestValidator.predicate(
    "active sessions should not have expired_at",
    activeSessions.data.length > 0,
  );

  TestValidator.predicate(
    "all returned sessions should be active (no expired_at)",
    activeSessions.data.every(
      (session) =>
        session.expired_at === undefined || session.expired_at === null,
    ),
  );

  // Step 5: Test pagination with filtered results
  const paginatedActiveSessions =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: {
        page: 1,
        limit: 1,
        expired_at: null,
      } satisfies ITodoAppUserSession.IRequest,
    });

  typia.assert(paginatedActiveSessions);

  TestValidator.predicate(
    "pagination should work with active session filter",
    paginatedActiveSessions.data.length > 0 &&
      paginatedActiveSessions.data.every(
        (session) =>
          session.expired_at === undefined || session.expired_at === null,
      ),
  );

  // Test that unfiltered sessions still work correctly (baseline test)
  const allSessions = await api.functional.todoApp.user.auth.sessions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );

  typia.assert(allSessions);

  TestValidator.predicate(
    "unfiltered sessions should return all sessions",
    allSessions.data.length >= sessionCount,
  );

  TestValidator.predicate(
    "filtered active sessions should be subset of all sessions",
    activeSessions.data.length <= allSessions.data.length,
  );
}
