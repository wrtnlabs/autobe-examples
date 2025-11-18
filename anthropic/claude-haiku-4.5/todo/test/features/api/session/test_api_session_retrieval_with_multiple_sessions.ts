import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test session retrieval when a user has multiple concurrent sessions from
 * different devices.
 *
 * This test validates proper multi-device session isolation and independent
 * session management by creating a user account and establishing multiple
 * sessions from different device contexts. Each session is retrieved
 * individually to verify that correct session details are returned and that
 * retrieving one session does not affect or expose data from other sessions.
 *
 * Test workflow:
 *
 * 1. Create initial user account with first session via join endpoint
 * 2. Login from second device context to create second session
 * 3. Login from third device context to create third session
 * 4. Generate session IDs and retrieve each session individually
 * 5. Validate session details and isolation between sessions
 */
export async function test_api_session_retrieval_with_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create initial user account with first session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123";

  const joinResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.100",
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinResponse);

  const userId = joinResponse.id;

  // Step 2: Login from second device to create second session
  const secondLoginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(secondLoginResponse);

  // Step 3: Login from third device to create third session
  const thirdLoginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(thirdLoginResponse);

  // Generate session IDs for retrieval testing
  const session1Id = typia.random<string & tags.Format<"uuid">>();
  const session2Id = typia.random<string & tags.Format<"uuid">>();
  const session3Id = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve first session with first auth token
  const firstSessionConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: joinResponse.token.access,
    },
  };

  const retrievedSession1 =
    await api.functional.todoList.user.auth.user.sessions.at(
      firstSessionConnection,
      { sessionId: session1Id },
    );
  typia.assert(retrievedSession1);
  TestValidator.equals(
    "first session ID matches",
    retrievedSession1.id,
    session1Id,
  );
  TestValidator.equals(
    "first session belongs to correct user",
    retrievedSession1.todo_list_user_id,
    userId,
  );
  TestValidator.predicate(
    "first session has IP address",
    retrievedSession1.ip_address.length > 0,
  );
  TestValidator.predicate(
    "first session has user agent",
    retrievedSession1.user_agent.length > 0,
  );
  TestValidator.predicate(
    "first session has creation timestamp",
    retrievedSession1.created_at.length > 0,
  );
  TestValidator.predicate(
    "first session has activity timestamp",
    retrievedSession1.last_activity_at.length > 0,
  );
  TestValidator.predicate(
    "first session has timeout timestamp",
    retrievedSession1.absolute_timeout_at.length > 0,
  );

  // Step 5: Retrieve second session with second auth token
  const secondSessionConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: secondLoginResponse.token.access,
    },
  };

  const retrievedSession2 =
    await api.functional.todoList.user.auth.user.sessions.at(
      secondSessionConnection,
      { sessionId: session2Id },
    );
  typia.assert(retrievedSession2);
  TestValidator.equals(
    "second session ID matches",
    retrievedSession2.id,
    session2Id,
  );
  TestValidator.equals(
    "second session belongs to correct user",
    retrievedSession2.todo_list_user_id,
    userId,
  );
  TestValidator.predicate(
    "second session has IP address",
    retrievedSession2.ip_address.length > 0,
  );
  TestValidator.predicate(
    "second session has user agent",
    retrievedSession2.user_agent.length > 0,
  );
  TestValidator.predicate(
    "second session has creation timestamp",
    retrievedSession2.created_at.length > 0,
  );
  TestValidator.predicate(
    "second session has activity timestamp",
    retrievedSession2.last_activity_at.length > 0,
  );
  TestValidator.predicate(
    "second session has timeout timestamp",
    retrievedSession2.absolute_timeout_at.length > 0,
  );

  // Step 6: Retrieve third session with third auth token
  const thirdSessionConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: thirdLoginResponse.token.access,
    },
  };

  const retrievedSession3 =
    await api.functional.todoList.user.auth.user.sessions.at(
      thirdSessionConnection,
      { sessionId: session3Id },
    );
  typia.assert(retrievedSession3);
  TestValidator.equals(
    "third session ID matches",
    retrievedSession3.id,
    session3Id,
  );
  TestValidator.equals(
    "third session belongs to correct user",
    retrievedSession3.todo_list_user_id,
    userId,
  );
  TestValidator.predicate(
    "third session has IP address",
    retrievedSession3.ip_address.length > 0,
  );
  TestValidator.predicate(
    "third session has user agent",
    retrievedSession3.user_agent.length > 0,
  );
  TestValidator.predicate(
    "third session has creation timestamp",
    retrievedSession3.created_at.length > 0,
  );
  TestValidator.predicate(
    "third session has activity timestamp",
    retrievedSession3.last_activity_at.length > 0,
  );
  TestValidator.predicate(
    "third session has timeout timestamp",
    retrievedSession3.absolute_timeout_at.length > 0,
  );

  // Step 7: Validate session isolation - verify each session is independent
  TestValidator.notEquals(
    "session 1 and 2 have different IDs",
    retrievedSession1.id,
    retrievedSession2.id,
  );
  TestValidator.notEquals(
    "session 2 and 3 have different IDs",
    retrievedSession2.id,
    retrievedSession3.id,
  );
  TestValidator.notEquals(
    "session 1 and 3 have different IDs",
    retrievedSession1.id,
    retrievedSession3.id,
  );

  // Verify all sessions belong to the same user
  TestValidator.equals(
    "all sessions belong to same user 1-2",
    retrievedSession1.todo_list_user_id,
    retrievedSession2.todo_list_user_id,
  );
  TestValidator.equals(
    "all sessions belong to same user 2-3",
    retrievedSession2.todo_list_user_id,
    retrievedSession3.todo_list_user_id,
  );
}
