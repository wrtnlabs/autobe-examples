import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test that a user can successfully retrieve detailed information about their
 * own specific authentication session.
 *
 * This test validates the self-service session management capability, ensuring
 * users can view session details for security monitoring purposes.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new user account (establishes initial session)
 * 2. Retrieve the session details using the session ID
 * 3. Validate all required session fields are present and populated correctly
 * 4. Verify the session data matches the authenticated user context
 * 5. Confirm active session characteristics (null expired_at)
 *
 * Note: This test uses a randomly generated session ID due to API limitations
 * (registration response does not include session ID). In a real scenario, the
 * session ID would be obtained from a session listing endpoint or included in
 * the authentication response.
 */
export async function test_api_user_session_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";
  const registrationHref = typia.random<string & tags.Format<"uri">>();
  const registrationReferrer = typia.random<string & tags.Format<"uri">>();

  const registrationBody = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.100",
    href: registrationHref,
    referrer: registrationReferrer,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: registrationBody,
  });
  typia.assert<ITodoListUser.IAuthorized>(authorizedUser);

  // Step 2: Validate business logic - email matches registration
  TestValidator.equals(
    "user email matches registration",
    authorizedUser.email,
    userEmail,
  );

  // Step 3: Generate session ID for retrieval
  // Note: In a complete implementation, this would come from the authentication
  // response or a separate session listing endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the session details using the session detail endpoint
  const sessionDetails = await api.functional.todoList.user.users.sessions.at(
    connection,
    {
      userId: authorizedUser.id,
      sessionId: sessionId,
    },
  );
  typia.assert<ITodoListUserSession>(sessionDetails);

  // Step 5: Validate business logic - session ID matches requested ID
  TestValidator.equals(
    "session ID matches requested ID",
    sessionDetails.id,
    sessionId,
  );

  // Step 6: Validate business logic - user ID in session matches authenticated user
  TestValidator.equals(
    "session user ID matches authenticated user",
    sessionDetails.todo_list_user_id,
    authorizedUser.id,
  );

  // Step 7: Validate business logic - user summary fields match
  TestValidator.equals(
    "session user ID matches user summary",
    sessionDetails.user.id,
    authorizedUser.id,
  );

  TestValidator.equals(
    "session user email matches",
    sessionDetails.user.email,
    userEmail,
  );

  // Step 8: Validate business logic - active session has null expired_at
  TestValidator.equals(
    "active session should have null expired_at",
    sessionDetails.expired_at,
    null,
  );

  // Step 9: Validate business logic - session creation timestamp is recent
  const sessionCreatedAt = new Date(sessionDetails.created_at);
  const now = new Date();
  const timeDifferenceMs = now.getTime() - sessionCreatedAt.getTime();
  const fiveMinutesMs = 5 * 60 * 1000;

  TestValidator.predicate(
    "session should be created recently (within 5 minutes)",
    timeDifferenceMs >= 0 && timeDifferenceMs < fiveMinutesMs,
  );
}
