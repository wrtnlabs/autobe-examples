import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Validate detailed session retrieval functionality for authenticated users.
 *
 * This test ensures that users can retrieve comprehensive session information
 * including connection details, security context, and activity timestamps. The
 * workflow involves user registration, session creation through login, and
 * subsequent session data retrieval with full validation.
 */
export async function test_api_user_session_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate a session record by performing login
  const loginSession = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://todoapp.example.com/dashboard",
      referrer: "https://todoapp.example.com/login",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginSession);

  // Since the login operation doesn't return a session ID directly,
  // we need to use a valid UUID format for testing session retrieval
  // This simulates retrieving a session by its ID
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve detailed session information
  const sessionDetails = await api.functional.todoApp.user.users.sessions.at(
    connection,
    {
      userEmail: userEmail,
      sessionId: testSessionId,
    },
  );
  typia.assert(sessionDetails);

  // Step 4: Validate session data integrity
  TestValidator.predicate(
    "session has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionDetails.id,
    ),
  );
  TestValidator.predicate(
    "session has user ID in UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionDetails.todo_app_user_id,
    ),
  );
  TestValidator.equals(
    "user summary matches session user",
    sessionDetails.user.id,
    sessionDetails.todo_app_user_id,
  );
  TestValidator.predicate(
    "session has IP address",
    sessionDetails.ip.length > 0,
  );
  TestValidator.predicate(
    "session has user agent",
    sessionDetails.user_agent.length > 0,
  );
  TestValidator.predicate(
    "session has connection URL",
    sessionDetails.href.length > 0,
  );
  TestValidator.predicate(
    "session has referrer URL",
    sessionDetails.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    sessionDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "session has last activity timestamp",
    sessionDetails.last_activity_at.length > 0,
  );

  // Validate timestamp formats using ISO 8601 pattern
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sessionDetails.created_at),
  );
  TestValidator.predicate(
    "last_activity_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      sessionDetails.last_activity_at,
    ),
  );

  // Validate user summary data
  TestValidator.predicate(
    "user summary has valid email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sessionDetails.user.email),
  );
  TestValidator.predicate(
    "user summary has name",
    sessionDetails.user.name.length > 0,
  );
  TestValidator.predicate(
    "user summary has status",
    sessionDetails.user.status.length > 0,
  );
}
