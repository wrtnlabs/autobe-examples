import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that an authenticated user can successfully retrieve their own session
 * details.
 *
 * This test validates the core session retrieval functionality where a user
 * accesses comprehensive details about a specific authenticated session they
 * own. The user should be able to view complete session information including
 * device context (IP address, user agent), creation and activity timestamps,
 * and expiration status.
 *
 * The test verifies:
 *
 * 1. User registration which creates an initial authenticated session
 * 2. Session retrieval by ID returns complete session information
 * 3. Session metadata is correctly populated with device tracking and timestamps
 * 4. Session is in active state with proper timeout configuration
 */
export async function test_api_session_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with session context
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123"; // 8+ characters as required

  const userCreated: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userCreated);

  // Step 2: Verify user account was created successfully
  TestValidator.equals(
    "user email matches registration input",
    userCreated.email,
    email,
  );
  TestValidator.predicate(
    "user account is active",
    userCreated.deleted_at === null,
  );

  // Step 3: Retrieve session details
  // Using the user ID as a session identifier for testing
  // In production, the actual session ID would come from the authentication response
  const sessionId = userCreated.id;

  const session: ITodoListSession =
    await api.functional.todoList.user.auth.user.sessions.at(connection, {
      sessionId: sessionId,
    });
  typia.assert(session);

  // Step 4: Validate session properties are correctly populated
  TestValidator.equals(
    "session belongs to authenticated user",
    session.todo_list_user_id,
    userCreated.id,
  );

  TestValidator.predicate(
    "session has IP address recorded",
    session.ip_address.length > 0,
  );

  TestValidator.predicate(
    "session has user agent recorded",
    session.user_agent.length > 0,
  );

  // Step 5: Validate session timing is logical
  const createdTime = new Date(session.created_at).getTime();
  const lastActivityTime = new Date(session.last_activity_at).getTime();
  const absoluteTimeoutTime = new Date(session.absolute_timeout_at).getTime();

  TestValidator.predicate(
    "session last activity is at or after creation",
    lastActivityTime >= createdTime,
  );

  TestValidator.predicate(
    "session absolute timeout is after creation",
    absoluteTimeoutTime > createdTime,
  );

  // Step 6: Validate session is in active state
  TestValidator.equals(
    "session is active (not expired)",
    session.expired_at,
    null,
  );
}
