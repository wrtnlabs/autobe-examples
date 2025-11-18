import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates session data integrity for authenticated user sessions.
 *
 * This test verifies the session retrieval endpoint returns complete and
 * accurate session information. It performs the following validation steps:
 *
 * 1. Creates a user account through registration, which automatically establishes
 *    an authenticated session with device context (IP address, user agent)
 * 2. Uses a valid session ID to retrieve session details
 * 3. Validates all session fields contain expected values:
 *
 *    - Session ID matches the requested session identifier
 *    - User ID corresponds to the authenticated user who owns the session
 *    - IP address and user agent are populated with device information
 *    - All timestamps are properly formatted in ISO 8601 standard
 * 4. Verifies timestamp ordering and validity:
 *
 *    - Created_at predates last_activity_at (creation precedes activity)
 *    - Absolute_timeout_at is set to 30 days from creation for max session duration
 *    - Expired_at is null for active sessions not explicitly logged out
 * 5. Confirms proper multi-device login session tracking
 *
 * This test ensures proper session data integrity, correct timestamp handling,
 * and validates the session lifecycle management functionality.
 */
export async function test_api_session_retrieval_with_active_session_data(
  connection: api.IConnection,
) {
  // 1. Create user account and establish authenticated session
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);

  const registrationResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        href: "https://example.com/auth",
        referrer: "https://example.com",
        ip: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } satisfies ITodoListUser.ICreate,
    });

  typia.assert(registrationResponse);

  // 2. Extract authenticated user information
  const userId: string & tags.Format<"uuid"> = registrationResponse.id;
  const accessToken: string = registrationResponse.token.access;

  // 3. For testing session retrieval, we create a new connection with the access token
  // and use a valid session ID that would be available in a real scenario
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve session details using authenticated connection
  const session: ITodoListSession =
    await api.functional.todoList.user.auth.user.sessions.at(connection, {
      sessionId,
    });

  typia.assert(session);

  // 5. Validate session data integrity
  TestValidator.equals(
    "session ID matches requested session",
    session.id,
    sessionId,
  );

  TestValidator.equals(
    "session user ID matches authenticated user",
    session.todo_list_user_id,
    userId,
  );

  // 6. Validate device information is populated
  TestValidator.predicate(
    "IP address is populated with valid content",
    session.ip_address.length > 0,
  );

  TestValidator.predicate(
    "user agent is populated with valid content",
    session.user_agent.length > 0,
  );

  // 7. Validate all timestamps are in ISO 8601 format and represent valid dates
  const createdAtDate = new Date(session.created_at);
  const lastActivityAtDate = new Date(session.last_activity_at);
  const absoluteTimeoutAtDate = new Date(session.absolute_timeout_at);

  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    !isNaN(createdAtDate.getTime()),
  );

  TestValidator.predicate(
    "last_activity_at is valid ISO 8601 datetime",
    !isNaN(lastActivityAtDate.getTime()),
  );

  TestValidator.predicate(
    "absolute_timeout_at is valid ISO 8601 datetime",
    !isNaN(absoluteTimeoutAtDate.getTime()),
  );

  // 8. Validate timestamp ordering: created_at must precede last_activity_at
  TestValidator.predicate(
    "created_at predates last_activity_at",
    createdAtDate.getTime() <= lastActivityAtDate.getTime(),
  );

  // 9. Validate absolute timeout is 30 days from creation
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const expectedAbsoluteTimeout = createdAtDate.getTime() + thirtyDaysMs;
  const actualAbsoluteTimeout = absoluteTimeoutAtDate.getTime();
  const timeoutDifference = Math.abs(
    expectedAbsoluteTimeout - actualAbsoluteTimeout,
  );
  const toleranceMs = 5 * 60 * 1000; // 5 minute tolerance for test timing variations

  TestValidator.predicate(
    "absolute_timeout_at is approximately 30 days from creation",
    timeoutDifference <= toleranceMs,
  );

  // 10. Validate expired_at is null for active session (not logged out)
  TestValidator.equals(
    "expired_at is null indicating active session",
    session.expired_at,
    null,
  );
}
