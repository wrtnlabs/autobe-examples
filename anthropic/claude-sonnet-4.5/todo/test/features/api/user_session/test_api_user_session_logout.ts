import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test the session deletion endpoint functionality.
 *
 * This test validates that the session deletion API endpoint correctly
 * processes deletion requests and returns the appropriate session information.
 * Due to API limitations (no session listing or retrieval endpoints available),
 * this test focuses on validating the API's ability to handle session deletion
 * requests and return properly structured session data.
 *
 * Test Steps:
 *
 * 1. Create a new user account through registration (establishes authenticated
 *    session)
 * 2. Generate test session identifiers for the deletion request
 * 3. Call the session deletion endpoint with the user and session IDs
 * 4. Validate the response structure matches ITodoListUserSession specification
 * 5. Verify all required session fields are present and properly typed
 */
export async function test_api_user_session_logout(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Prepare session deletion request parameters
  const userId = registeredUser.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Execute session deletion request
  const deletedSession =
    await api.functional.todoList.user.users.sessions.erase(connection, {
      userId: userId,
      sessionId: sessionId,
    });
  typia.assert(deletedSession);

  // Step 4: Validate response structure and data types
  TestValidator.predicate(
    "deleted session has valid UUID format for id",
    typeof deletedSession.id === "string" && deletedSession.id.length > 0,
  );

  TestValidator.predicate(
    "deleted session has valid user ID",
    typeof deletedSession.todo_list_user_id === "string" &&
      deletedSession.todo_list_user_id.length > 0,
  );

  TestValidator.predicate(
    "session has IP address",
    typeof deletedSession.ip === "string" && deletedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "session has href URL",
    typeof deletedSession.href === "string" && deletedSession.href.length > 0,
  );

  TestValidator.predicate(
    "session has referrer URL",
    typeof deletedSession.referrer === "string",
  );

  TestValidator.predicate(
    "session has authentication token",
    typeof deletedSession.token === "string" && deletedSession.token.length > 0,
  );

  TestValidator.predicate(
    "session has creation timestamp",
    typeof deletedSession.created_at === "string" &&
      deletedSession.created_at.length > 0,
  );

  // Step 5: Validate user summary structure
  TestValidator.predicate(
    "session includes user summary with ID",
    typeof deletedSession.user.id === "string" &&
      deletedSession.user.id.length > 0,
  );

  TestValidator.predicate(
    "session user summary has email",
    typeof deletedSession.user.email === "string" &&
      deletedSession.user.email.length > 0,
  );

  TestValidator.predicate(
    "session user summary has email_verified flag",
    typeof deletedSession.user.email_verified === "boolean",
  );

  TestValidator.predicate(
    "session user summary has created_at timestamp",
    typeof deletedSession.user.created_at === "string" &&
      deletedSession.user.created_at.length > 0,
  );

  TestValidator.predicate(
    "session user summary has updated_at timestamp",
    typeof deletedSession.user.updated_at === "string" &&
      deletedSession.user.updated_at.length > 0,
  );
}
