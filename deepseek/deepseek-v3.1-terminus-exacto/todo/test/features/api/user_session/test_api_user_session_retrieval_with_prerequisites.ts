import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test session retrieval workflow with proper prerequisite validation.
 * Validates that session retrieval requires both user registration and session
 * creation as prerequisites. The test ensures that attempting to retrieve
 * non-existent sessions or sessions for non-existent users returns appropriate
 * error responses and maintains data integrity.
 */
export async function test_api_user_session_retrieval_with_prerequisites(
  connection: api.IConnection,
) {
  // Step 1: Register user account as prerequisite for session creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create system configuration as specified prerequisite
  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: "session.timeout",
        value: "3600",
        description: "Session timeout in seconds",
        category: "security",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Authenticate user for session creation
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Step 4: Create session that will be retrieved
  const sessionData = {
    href: "https://example.com/todo-app/dashboard",
    referrer: "https://example.com/todo-app",
    ip: "192.168.1.100",
  } satisfies ITodoListUserSession.ICreate;

  const createdSession = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: sessionData,
    },
  );
  typia.assert(createdSession);

  // Step 5: Retrieve the created session successfully
  const retrievedSession = await api.functional.todoList.user.users.sessions.at(
    connection,
    {
      userId: user.id,
      sessionId: createdSession.id,
    },
  );
  typia.assert(retrievedSession);

  // Validate session data matches
  TestValidator.equals(
    "retrieved session ID matches created session",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "retrieved session href matches",
    retrievedSession.href,
    sessionData.href,
  );
  TestValidator.equals(
    "retrieved session referrer matches",
    retrievedSession.referrer,
    sessionData.referrer,
  );
  TestValidator.equals(
    "retrieved session IP matches",
    retrievedSession.ip,
    sessionData.ip,
  );
  TestValidator.equals(
    "retrieved session user ID matches",
    retrievedSession.user.id,
    user.id,
  );

  // Step 6: Test error handling for non-existent session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent session should fail",
    async () => {
      await api.functional.todoList.user.users.sessions.at(connection, {
        userId: user.id,
        sessionId: nonExistentSessionId,
      });
    },
  );

  // Step 7: Test error handling for non-existent user
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving session for non-existent user should fail",
    async () => {
      await api.functional.todoList.user.users.sessions.at(connection, {
        userId: nonExistentUserId,
        sessionId: createdSession.id,
      });
    },
  );
}
