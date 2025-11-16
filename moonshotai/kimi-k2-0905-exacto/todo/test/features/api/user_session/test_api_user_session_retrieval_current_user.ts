import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * This test validates that authenticated users can retrieve detailed
 * information about their own authentication sessions. The test establishes a
 * user account through registration, creates an active login session, then
 * retrieves comprehensive session metadata including IP address, connection
 * URL, referrer details, and timestamps. The test ensures proper authorization
 * checks that users can only access sessions belonging to their own account,
 * maintaining privacy standards while providing complete visibility into
 * personal authentication activity for security monitoring purposes.
 *
 * @param connection API connection with established session context
 */
export async function test_api_user_session_retrieval_current_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinRequest = {
    email,
    password,
    href: "https://test.example.com/signup",
    referrer: "https://test.example.com/home",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(user);

  // Step 2: Logout to clear headers and create a fresh session context
  connection.headers = {};

  // Step 3: Authenticate the user to create a new session with connection metadata
  const loginRequest = {
    email,
    password,
    href: "https://test.example.com/login",
    referrer: "https://test.example.com/signup",
  } satisfies ITodoAppUser.ILogin;

  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: loginRequest,
  });
  typia.assert(authenticatedUser);

  // Step 4: Retrieve the current session information using the token as session identifier
  const sessionId = authenticatedUser.token.access;
  const sessionDetails = await api.functional.todoApp.user.auth.sessions.at(
    connection,
    {
      sessionId,
    },
  );
  typia.assert(sessionDetails);

  // Step 5: Validate that the retrieved session includes comprehensive security metadata
  TestValidator.equals("session ID exists", typeof sessionDetails.id, "string");
  TestValidator.predicate(
    "session ID is valid UUID format",
    sessionDetails.id.includes("-") && sessionDetails.id.length === 36,
  );

  TestValidator.equals(
    "session contains IP address",
    typeof sessionDetails.ip,
    "string",
  );
  TestValidator.predicate(
    "IP address is valid",
    sessionDetails.ip.length > 0 && sessionDetails.ip.length <= 45,
  );

  TestValidator.equals(
    "session contains connection URL",
    typeof sessionDetails.href,
    "string",
  );
  TestValidator.equals(
    "connection URL matches login request",
    sessionDetails.href,
    loginRequest.href,
  );

  TestValidator.equals(
    "session contains referrer URL",
    typeof sessionDetails.referrer,
    "string",
  );
  TestValidator.equals(
    "referrer URL matches login request",
    sessionDetails.referrer,
    loginRequest.referrer,
  );

  TestValidator.equals(
    "session contains creation timestamp",
    typeof sessionDetails.created_at,
    "string",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    sessionDetails.created_at.endsWith("Z") ||
      sessionDetails.created_at.includes("+"),
  );

  // Step 6: Validate that session data contains proper user context and relationship mapping
  TestValidator.equals(
    "session contains user ID",
    typeof sessionDetails.user_id,
    "string",
  );
  TestValidator.equals(
    "user ID matches authenticated user",
    sessionDetails.user_id,
    authenticatedUser.id,
  );

  // Optional user summary should contain contextual information for display
  if (sessionDetails.user) {
    TestValidator.equals(
      "user summary contains ID",
      typeof sessionDetails.user.id,
      "string",
    );
    TestValidator.equals(
      "user summary ID matches authenticated user",
      sessionDetails.user.id,
      authenticatedUser.id,
    );
    TestValidator.equals(
      "user summary contains email",
      typeof sessionDetails.user.email,
      "string",
    );
    TestValidator.equals(
      "user summary email matches authenticated user",
      sessionDetails.user.email,
      authenticatedUser.email,
    );
  }
}
