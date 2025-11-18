import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test retrieval of user session details for security auditing purposes.
 *
 * This E2E test validates that users can access comprehensive session
 * information including connection metadata (IP address, URL, referrer) and
 * timestamps. The test creates a user account, authenticates the user to
 * establish session context, creates a session record, then retrieves and
 * validates the session details for security monitoring and audit compliance.
 */
export async function test_api_user_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Create user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Authenticate the user to establish session context
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginResponse);

  // Create a session record for the user
  const sessionData = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: {
        href: "https://example.com/todo-app/dashboard",
        referrer: "https://example.com/todo-app",
      } satisfies ITodoListUserSession.ICreate,
    },
  );
  typia.assert(sessionData);

  // Retrieve the session details
  const retrievedSession = await api.functional.todoList.user.users.sessions.at(
    connection,
    {
      userId: user.id,
      sessionId: sessionData.id,
    },
  );
  typia.assert(retrievedSession);

  // Validate comprehensive session information
  TestValidator.equals(
    "session ID matches",
    retrievedSession.id,
    sessionData.id,
  );
  TestValidator.equals("user ID matches", retrievedSession.user.id, user.id);
  TestValidator.equals(
    "user email matches",
    retrievedSession.user.email,
    user.email,
  );
  TestValidator.predicate("session has href", retrievedSession.href.length > 0);
  TestValidator.predicate(
    "session has referrer",
    retrievedSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    retrievedSession.created_at.length > 0,
  );
  TestValidator.equals(
    "session status is active",
    retrievedSession.expired_at,
    undefined,
  );
}
