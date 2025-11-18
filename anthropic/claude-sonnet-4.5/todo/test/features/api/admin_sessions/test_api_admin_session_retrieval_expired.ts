import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test retrieval of expired admin session with terminated status.
 *
 * This test validates that administrators can retrieve historical session
 * information even after sessions have been terminated. The test creates an
 * admin account, establishes a session, terminates it through session
 * revocation, and then retrieves the expired session to verify it has a
 * non-null expired_at timestamp.
 *
 * This functionality is critical for security auditing, allowing admins to
 * review their session history and identify when and from where sessions were
 * terminated. The ability to access expired session data helps with security
 * monitoring and investigation of account activity.
 *
 * Steps:
 *
 * 1. Create a new admin account (auto-authenticates and creates session)
 * 2. Generate a mock session ID (limitation: cannot retrieve actual session ID
 *    from join response)
 * 3. Terminate the session to create expired state
 * 4. Retrieve the expired session by its ID
 * 5. Verify the session has non-null expired_at timestamp
 *
 * Note: This test has a limitation due to API structure - the join endpoint
 * does not return the session ID, so we use a generated UUID. In a production
 * scenario, there should be an endpoint to list current sessions or the session
 * ID should be included in the authentication response.
 */
export async function test_api_admin_session_retrieval_expired(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account and establish initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdminPass123!";
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.100",
    href: connectionHref,
    referrer: connectionReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const adminAuthorized: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // Step 2: Generate a session ID for testing
  // Note: In a real scenario, this ID would come from a session list endpoint
  // or be included in the authentication response
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Terminate the session to create expired state
  await api.functional.todoList.admin.admins.me.sessions.erase(connection, {
    sessionId,
  });

  // Step 4: Retrieve the expired session by its ID
  const expiredSession: ITodoListAdminSession =
    await api.functional.todoList.admin.admins.me.sessions.at(connection, {
      sessionId,
    });
  typia.assert(expiredSession);

  // Step 5: Verify the session has expired (expired_at is not null)
  TestValidator.predicate(
    "expired session should have non-null expired_at timestamp",
    expiredSession.expired_at !== null,
  );

  // Additional validations
  TestValidator.equals(
    "session ID should match the requested ID",
    expiredSession.id,
    sessionId,
  );

  TestValidator.equals(
    "session should belong to the created admin",
    expiredSession.todo_list_admin_id,
    adminAuthorized.id,
  );
}
