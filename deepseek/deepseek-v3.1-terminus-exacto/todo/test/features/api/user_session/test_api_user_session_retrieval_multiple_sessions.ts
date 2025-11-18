import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test retrieving specific session from multiple existing sessions.
 *
 * This test validates that sessions can be retrieved individually by ID when
 * multiple sessions exist for the same user. It creates two sessions with
 * different connection details and verifies that each session contains correct
 * unique information and is properly isolated.
 */
export async function test_api_user_session_retrieval_multiple_sessions(
  connection: api.IConnection,
) {
  // Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Create first session with specific connection details
  const session1Data = {
    ip: "192.168.1.100",
    href: "https://example.com/page1" satisfies string & tags.Format<"uri">,
    referrer: "https://google.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListUserSession.ICreate;

  const session1 = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: session1Data,
    },
  );
  typia.assert(session1);

  // Create second session with different connection details
  const session2Data = {
    ip: "192.168.1.101",
    href: "https://example.com/page2" satisfies string & tags.Format<"uri">,
    referrer: "https://bing.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListUserSession.ICreate;

  const session2 = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: session2Data,
    },
  );
  typia.assert(session2);

  // Verify sessions have unique IDs
  TestValidator.notEquals(
    "session IDs should be unique",
    session1.id,
    session2.id,
  );

  // Retrieve first session by ID
  const retrievedSession1 =
    await api.functional.todoList.user.users.sessions.at(connection, {
      userId: user.id,
      sessionId: session1.id,
    });
  typia.assert(retrievedSession1);

  // Validate first session data
  TestValidator.equals(
    "retrieved session1 ID should match",
    retrievedSession1.id,
    session1.id,
  );
  TestValidator.equals(
    "session1 user ID should match",
    retrievedSession1.user.id,
    user.id,
  );
  TestValidator.equals(
    "session1 IP should match",
    retrievedSession1.ip,
    session1Data.ip,
  );
  TestValidator.equals(
    "session1 URL should match",
    retrievedSession1.href,
    session1Data.href,
  );
  TestValidator.equals(
    "session1 referrer should match",
    retrievedSession1.referrer,
    session1Data.referrer,
  );

  // Retrieve second session by ID
  const retrievedSession2 =
    await api.functional.todoList.user.users.sessions.at(connection, {
      userId: user.id,
      sessionId: session2.id,
    });
  typia.assert(retrievedSession2);

  // Validate second session data
  TestValidator.equals(
    "retrieved session2 ID should match",
    retrievedSession2.id,
    session2.id,
  );
  TestValidator.equals(
    "session2 user ID should match",
    retrievedSession2.user.id,
    user.id,
  );
  TestValidator.equals(
    "session2 IP should match",
    retrievedSession2.ip,
    session2Data.ip,
  );
  TestValidator.equals(
    "session2 URL should match",
    retrievedSession2.href,
    session2Data.href,
  );
  TestValidator.equals(
    "session2 referrer should match",
    retrievedSession2.referrer,
    session2Data.referrer,
  );

  // Verify sessions are properly isolated (each retrieval returns the correct session)
  TestValidator.notEquals(
    "session1 and session2 IPs should differ",
    retrievedSession1.ip,
    retrievedSession2.ip,
  );
  TestValidator.notEquals(
    "session1 and session2 URLs should differ",
    retrievedSession1.href,
    retrievedSession2.href,
  );
  TestValidator.notEquals(
    "session1 and session2 referrers should differ",
    retrievedSession1.referrer,
    retrievedSession2.referrer,
  );
}
