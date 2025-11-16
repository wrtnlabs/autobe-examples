import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test user session creation and session deletion endpoint functionality.
 *
 * This test validates the session lifecycle by creating a user account (which
 * automatically establishes an initial session) and then testing the session
 * deletion endpoint to ensure it properly handles session termination requests
 * and returns complete session metadata.
 *
 * The test focuses on:
 *
 * - User registration with automatic session creation
 * - Session deletion endpoint validation
 * - Session metadata structure compliance
 * - Complete ITodoListUserSession response validation
 *
 * Test Steps:
 *
 * 1. Create a new user account (automatically creates initial session)
 * 2. Call session deletion endpoint with the user's session
 * 3. Validate complete session metadata in deletion response
 * 4. Verify ITodoListUserSession structure compliance
 * 5. Confirm all required fields are properly populated
 */
export async function test_api_user_session_cleanup_lifecycle(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account which automatically establishes initial session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  const registrationHref = `https://todolist.example.com/register`;
  const registrationReferrer = `https://google.com/search?q=todo+list+app`;
  const clientIp = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;

  const registrationData = {
    email: userEmail,
    password: userPassword,
    href: registrationHref,
    referrer: registrationReferrer,
    ip: clientIp,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });
  typia.assert(authorizedUser);

  // Verify user was created successfully
  TestValidator.equals(
    "user email matches registration",
    authorizedUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "user has valid UUID",
    typia.is<string & tags.Format<"uuid">>(authorizedUser.id),
  );
  TestValidator.predicate(
    "access token is provided",
    authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    authorizedUser.token.refresh.length > 0,
  );

  // Step 2: Test session deletion endpoint
  // Generate a session ID to test the deletion endpoint
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  const deletedSession =
    await api.functional.todoList.user.users.sessions.erase(connection, {
      userId: authorizedUser.id,
      sessionId: testSessionId,
    });
  typia.assert(deletedSession);

  // Step 3: Validate complete session metadata structure
  TestValidator.predicate(
    "session has valid UUID",
    typia.is<string & tags.Format<"uuid">>(deletedSession.id),
  );
  TestValidator.predicate(
    "session user reference is valid UUID",
    typia.is<string & tags.Format<"uuid">>(deletedSession.todo_list_user_id),
  );
  TestValidator.predicate(
    "session IP address exists",
    deletedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session href is valid URI",
    typia.is<string & tags.Format<"uri">>(deletedSession.href),
  );
  TestValidator.predicate(
    "session referrer is valid URI",
    typia.is<string & tags.Format<"uri">>(deletedSession.referrer),
  );
  TestValidator.predicate(
    "session token exists",
    deletedSession.token.length > 0,
  );
  TestValidator.predicate(
    "session created_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(deletedSession.created_at),
  );

  // Step 4: Validate user summary in session response
  TestValidator.predicate(
    "session user summary has valid UUID",
    typia.is<string & tags.Format<"uuid">>(deletedSession.user.id),
  );
  TestValidator.predicate(
    "session user email is valid",
    typia.is<string & tags.Format<"email">>(deletedSession.user.email),
  );
  TestValidator.predicate(
    "session user has email_verified boolean",
    typeof deletedSession.user.email_verified === "boolean",
  );
  TestValidator.predicate(
    "session user created_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(deletedSession.user.created_at),
  );
  TestValidator.predicate(
    "session user updated_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(deletedSession.user.updated_at),
  );

  // Step 5: Validate expired_at field (can be null for active sessions or date-time for terminated)
  if (deletedSession.expired_at !== null) {
    TestValidator.predicate(
      "expired_at is valid date-time when present",
      typia.is<string & tags.Format<"date-time">>(deletedSession.expired_at),
    );
  }
}
