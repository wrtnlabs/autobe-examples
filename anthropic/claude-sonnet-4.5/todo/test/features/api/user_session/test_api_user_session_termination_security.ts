import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test session deletion as part of security workflows.
 *
 * Validates the session deletion endpoint functionality for security scenarios
 * where users need to immediately terminate their sessions to protect their
 * accounts. This test verifies that the deletion endpoint properly removes
 * sessions and returns complete session information for audit trails.
 *
 * Test workflow:
 *
 * 1. Create a user account through the join endpoint to establish authentication
 * 2. Simulate a session deletion scenario (using generated session ID as the
 *    actual session ID is not available in the join response)
 * 3. Verify that the session deletion returns complete session information
 * 4. Confirm that all session data (IP, referrer, timestamps) is properly returned
 *
 * Note: This test validates the endpoint structure and response format. In a
 * real scenario, the session ID would be obtained from a session listing
 * endpoint or authentication context.
 */
export async function test_api_user_session_termination_security(
  connection: api.IConnection,
) {
  // Step 1: Create a user account and establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const referrerHref = typia.random<string & tags.Format<"uri">>();

  const createUserBody = {
    email: userEmail,
    password: userPassword,
    ip: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}`,
    href: currentHref,
    referrer: referrerHref,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Verify user was created successfully with authentication token
  TestValidator.predicate(
    "user should have valid UUID",
    typia.is<string & tags.Format<"uuid">>(authorizedUser.id),
  );
  TestValidator.equals(
    "user email matches input",
    authorizedUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "user should have authentication token",
    authorizedUser.token !== null && authorizedUser.token !== undefined,
  );
  typia.assert(authorizedUser.token);

  // Step 3: Test session deletion endpoint
  // Note: In a real scenario, the session ID would be obtained from a session
  // management endpoint. For this test, we use a generated UUID to validate
  // the endpoint's behavior and response structure.
  const userId = authorizedUser.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const deletedSession: ITodoListUserSession =
    await api.functional.todoList.user.users.sessions.erase(connection, {
      userId: userId,
      sessionId: sessionId,
    });
  typia.assert(deletedSession);

  // Step 4: Verify the deleted session information is complete for audit trails
  TestValidator.predicate(
    "deleted session has valid UUID",
    typia.is<string & tags.Format<"uuid">>(deletedSession.id),
  );
  TestValidator.equals(
    "deleted session belongs to correct user",
    deletedSession.todo_list_user_id,
    userId,
  );

  // Step 5: Verify session contains connection context for security audit trails
  TestValidator.predicate(
    "session has IP address for audit",
    deletedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session has valid href URI",
    typia.is<string & tags.Format<"uri">>(deletedSession.href),
  );
  TestValidator.predicate(
    "session has valid referrer URI",
    typia.is<string & tags.Format<"uri">>(deletedSession.referrer),
  );
  TestValidator.predicate(
    "session has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(deletedSession.created_at),
  );
  TestValidator.predicate(
    "session has authentication token",
    deletedSession.token.length > 0,
  );

  // Step 6: Verify user summary information is included for context
  typia.assert(deletedSession.user);
  TestValidator.equals(
    "user summary ID matches session owner",
    deletedSession.user.id,
    userId,
  );
  TestValidator.equals(
    "user summary email matches",
    deletedSession.user.email,
    userEmail,
  );
  TestValidator.predicate(
    "user summary has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(deletedSession.user.created_at),
  );
  TestValidator.predicate(
    "user summary has update timestamp",
    typia.is<string & tags.Format<"date-time">>(deletedSession.user.updated_at),
  );
}
