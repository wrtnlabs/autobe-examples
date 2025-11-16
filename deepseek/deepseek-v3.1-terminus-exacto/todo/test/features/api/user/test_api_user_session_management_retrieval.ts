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
 * Test user session management functionality by retrieving filtered and
 * paginated session lists. Create a new user account and establish multiple
 * sessions with different contexts (various IP addresses, connection URLs, and
 * referrers). Test filtering capabilities by session status (active/expired),
 * creation date ranges, IP pattern matching, and sorting options. Validate that
 * users can only access their own session data and cannot view sessions
 * belonging to other users.
 */
export async function test_api_user_session_management_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a primary user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const now = new Date().toISOString();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      password_hash: typia.random<string>(),
      created_at: now,
      updated_at: now,
      status: "active",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create multiple sessions with different connection contexts
  const sessionContexts = [
    {
      ip: "192.168.1.100",
      href: "https://app.example.com/dashboard",
      referrer: "https://app.example.com/login",
    },
    {
      ip: "10.0.0.50",
      href: "https://app.example.com/profile",
      referrer: "https://app.example.com/dashboard",
    },
    {
      ip: "172.16.1.200",
      href: "https://app.example.com/settings",
      referrer: "https://app.example.com/profile",
    },
  ] as const;

  // Create sessions by logging in with different contexts - using await in loop
  for (const context of sessionContexts) {
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: "password123",
        ip: context.ip,
        href: context.href,
        referrer: context.referrer,
      } satisfies ITodoAppUser.ICredentials,
    });
  }

  // 3. Test the session retrieval API with various filtering parameters

  // Test basic pagination
  const firstPage = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have data",
    firstPage.data.length > 0,
    true,
  );
  TestValidator.equals("page should be 1", firstPage.pagination.current, 1);

  // Test active sessions filter
  const activeSessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(activeSessions);

  // Test IP pattern matching
  const ipFilteredSessions =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        ip_pattern: "192.168.*",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(ipFilteredSessions);

  // Test creation date range with order by
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const dateFilteredSessions =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        created_at_start: oneDayAgo,
        created_at_end: now,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(dateFilteredSessions);

  // 4. Create a second user to test access control
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserNow = new Date().toISOString();

  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "password456",
      password_hash: typia.random<string>(),
      created_at: secondUserNow,
      updated_at: secondUserNow,
      status: "active",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // 5. Create a session for the second user
  await api.functional.auth.user.login(connection, {
    body: {
      email: secondUserEmail,
      password: "password456",
      ip: "192.168.1.150",
      href: "https://app.example.com/dashboard",
      referrer: "https://app.example.com/login",
    } satisfies ITodoAppUser.ICredentials,
  });

  // 6. Verify access control - second user should not be able to access first user's sessions
  await TestValidator.error(
    "second user cannot access first user's sessions",
    async () => {
      await api.functional.todoApp.user.users.sessions.index(connection, {
        userId: user.id, // Trying to access first user's sessions as second user
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppUserSession.IRequest,
      });
    },
  );

  // 7. Test URL pattern matching
  const urlFilteredSessions =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        href_pattern: "*dashboard*",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(urlFilteredSessions);

  // 8. Test referrer pattern matching
  const referrerFilteredSessions =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        referrer_pattern: "*login*",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(referrerFilteredSessions);

  // 9. Validate session data structure
  if (firstPage.data.length > 0) {
    const session = firstPage.data[0];
    TestValidator.predicate("session should have UUID ID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate("session should have valid IP address", () =>
      /^(\d{1,3}\.){3}\d{1,3}$/.test(session.ip),
    );
    TestValidator.equals(
      "session should have href",
      typeof session.href,
      "string",
    );
    TestValidator.equals(
      "session should have referrer",
      typeof session.referrer,
      "string",
    );
    TestValidator.predicate(
      "session should have valid created_at timestamp",
      () => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
    );

    // Validate that expired_at is either string or null/undefined
    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate("expired_at should be valid timestamp", () =>
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
      );
    }
  }
}
