import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test that an administrator can successfully retrieve detailed information
 * about a specific user's authentication session.
 *
 * This test validates the admin's ability to monitor and inspect user sessions
 * for administrative oversight and security purposes. The test creates a user
 * account, establishes a user session, then authenticates as admin to retrieve
 * the session details.
 *
 * Workflow:
 *
 * 1. Create a regular user account (automatically creates initial session)
 * 2. Authenticate as administrator
 * 3. Retrieve the user's session details using admin credentials
 * 4. Verify that the response includes complete session information
 * 5. Confirm session belongs to the correct user with accurate connection context
 *
 * Note: This test uses randomly generated sessionId because the user.join
 * endpoint does not return the sessionId in its response, even though it
 * creates a session. In a production scenario, there would need to be a session
 * listing endpoint or the sessionId would be included in the join response.
 */
export async function test_api_user_session_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a user account which automatically establishes an authentication session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "userPass123";
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const userCreateBody = {
    email: userEmail,
    password: userPassword,
    href: connectionHref,
    referrer: connectionReferrer,
  } satisfies ITodoListUser.ICreate;

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // Step 2: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminSecure999";
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(createdAdmin);

  // Step 3: Retrieve the user's session using admin credentials
  // Note: Using random sessionId since the actual sessionId is not available from user.join response
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const retrievedSession: ITodoListUserSession =
    await api.functional.todoList.admin.users.sessions.at(connection, {
      userId: createdUser.id,
      sessionId: sessionId,
    });
  typia.assert(retrievedSession);

  // Step 4: Verify the retrieved session contains complete information
  TestValidator.equals(
    "session ID matches requested",
    retrievedSession.id,
    sessionId,
  );
  TestValidator.equals(
    "session user ID matches",
    retrievedSession.todo_list_user_id,
    createdUser.id,
  );
  TestValidator.predicate(
    "session has authentication token",
    typeof retrievedSession.token === "string" &&
      retrievedSession.token.length > 0,
  );
  TestValidator.predicate(
    "session has IP address",
    typeof retrievedSession.ip === "string" && retrievedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session has href",
    typeof retrievedSession.href === "string" &&
      retrievedSession.href.length > 0,
  );
  TestValidator.predicate(
    "session has referrer",
    typeof retrievedSession.referrer === "string" &&
      retrievedSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    typeof retrievedSession.created_at === "string" &&
      retrievedSession.created_at.length > 0,
  );

  // Step 5: Verify user summary information in the session
  TestValidator.predicate(
    "session includes user summary",
    typeof retrievedSession.user === "object" && retrievedSession.user !== null,
  );
  TestValidator.equals(
    "session user summary ID matches",
    retrievedSession.user.id,
    createdUser.id,
  );
  TestValidator.equals(
    "session user summary email matches",
    retrievedSession.user.email,
    createdUser.email,
  );
}
