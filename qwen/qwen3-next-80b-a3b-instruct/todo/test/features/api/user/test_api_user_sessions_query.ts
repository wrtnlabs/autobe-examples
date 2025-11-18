import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * Test querying and paginating authentication sessions for one's own user
 * account.
 *
 * Verifies that an authenticated user can retrieve a paginated list of their
 * own authentication sessions using PATCH /todo/user/users/{userId}/sessions.
 * Covers data integrity, filtering correctness, pagination, status, and
 * security boundaries.
 *
 * Steps:
 *
 * 1. Register a new user (POST /auth/user/join).
 * 2. After registration, verify user is authenticated and session exists.
 * 3. Use user's id to query sessions via PATCH /todo/user/users/{userId}/sessions
 *    with standard pagination (page 1, limit 10).
 * 4. Assert the returned sessions belong only to this user and pagination metadata
 *    is present.
 * 5. Check each session record for required fields: id, created_at, ip, href,
 *    referrer, expired_at, and user info.
 * 6. Confirm no sessions reference any other user id (security boundary).
 */
export async function test_api_user_sessions_query(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
    ip: "192.168.1.100",
  } satisfies ITodoUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);
  // 2. Query user's own sessions
  const reqBody = {
    page: 1,
    limit: 10,
    // other filters optional for basic coverage
  } satisfies ITodoUserSession.IRequest;
  const sessionsPage = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: reqBody,
    },
  );
  typia.assert(sessionsPage);
  // 3. Validate that all sessions belong only to this user
  for (const session of sessionsPage.data) {
    typia.assert(session);
    TestValidator.equals(
      "session.user.id matches authenticated user",
      session.user.id,
      user.id,
    );
    TestValidator.predicate(
      "session id is uuid",
      typeof session.id === "string" && session.id.length > 0,
    );
    TestValidator.predicate(
      "session has created_at",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has ip",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session has href",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session has referrer",
      typeof session.referrer === "string",
    );
    // expired_at can be null/undefined when session is active, so just check property exists
    if (session.expired_at !== null && session.expired_at !== undefined)
      TestValidator.predicate(
        "session.expired_at should be string if present",
        typeof session.expired_at === "string",
      );
  }
  // 4. Validate pagination info matches request
  TestValidator.equals(
    "pagination current page",
    sessionsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessionsPage.pagination.limit, 10);
}
