import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test the session termination endpoint functionality.
 *
 * This test validates that the session termination API endpoint correctly
 * processes requests and returns properly structured session data with
 * termination metadata.
 *
 * Workflow:
 *
 * 1. Create a new user account through registration (establishes authentication)
 * 2. Call the session termination endpoint with a session ID
 * 3. Validate the response contains proper session termination data structure
 *
 * Note: Since the API does not provide a way to retrieve session IDs from the
 * registration response or list existing sessions, this test focuses on
 * validating the endpoint's response structure and data integrity.
 */
export async function test_api_user_session_single_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and establish authenticated session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.100",
    href: connectionHref,
    referrer: connectionReferrer,
  } satisfies ITodoListUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });
  typia.assert(authorizedUser);

  // Validate user registration succeeded
  TestValidator.equals("user email matches", authorizedUser.email, userEmail);
  TestValidator.predicate("user has valid ID", authorizedUser.id.length > 0);
  TestValidator.predicate(
    "access token exists",
    authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorizedUser.token.refresh.length > 0,
  );

  // Step 2: Call session termination endpoint
  // Using a UUID format session ID to test the endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const terminatedSession =
    await api.functional.todoList.user.users.me.sessions.erase(connection, {
      sessionId: sessionId,
    });
  typia.assert(terminatedSession);

  // Step 3: Validate session termination response structure
  TestValidator.predicate(
    "session has valid UUID ID",
    terminatedSession.id.length > 0,
  );
  TestValidator.predicate(
    "session has expired_at timestamp set",
    terminatedSession.expired_at !== null,
  );

  // Validate session metadata is present and properly structured
  TestValidator.predicate(
    "session has IP address",
    terminatedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session has href",
    terminatedSession.href.length > 0,
  );
  TestValidator.predicate(
    "session has referrer",
    terminatedSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has created_at",
    terminatedSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "session has valid user_id",
    terminatedSession.todo_list_user_id.length > 0,
  );
}
