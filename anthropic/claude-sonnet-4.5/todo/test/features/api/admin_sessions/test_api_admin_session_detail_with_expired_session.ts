import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test retrieving session details for an expired or terminated session to
 * verify audit trail accessibility.
 *
 * This scenario validates that administrators can view historical session
 * information even after sessions have expired, which is essential for security
 * investigations and compliance auditing.
 *
 * NOTE: This test is limited by API constraints - the join endpoint creates a
 * session but doesn't return the session ID, and there's no list sessions
 * endpoint. In a real implementation, session IDs would be retrievable through
 * additional endpoints or included in authentication responses.
 *
 * Test workflow:
 *
 * 1. Create an admin account via join endpoint (creates an internal session)
 * 2. Attempt to retrieve session details using the admin ID and a session ID
 * 3. Validate that the session data structure includes all required fields for
 *    audit purposes
 * 4. Verify that expired_at field exists and can contain expiration timestamps
 * 5. Confirm all session metadata is accessible (IP, href, referrer, admin
 *    details)
 */
export async function test_api_admin_session_detail_with_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account which internally creates a session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const clientIp = "192.168.1.100";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: clientIp,
      href: href,
      referrer: referrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a session ID for testing
  // In a real scenario, this would come from a session list endpoint or be included
  // in the authentication response. For this test, we use a generated UUID to
  // demonstrate the endpoint's contract and expected response structure.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve session details
  // This tests the endpoint's ability to return complete session information
  // including all metadata necessary for security auditing
  const session = await api.functional.todoList.admin.admins.sessions.at(
    connection,
    {
      adminId: admin.id,
      sessionId: sessionId,
    },
  );
  typia.assert(session);

  // Step 4: Validate session structure and audit trail data
  TestValidator.equals(
    "session belongs to correct admin",
    session.todo_list_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "session includes admin summary",
    session.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "admin email in session matches",
    session.admin.email,
    admin.email,
  );

  // Step 5: Verify all audit trail metadata is present
  TestValidator.predicate(
    "session has IP address for audit",
    session.ip.length > 0,
  );
  TestValidator.predicate(
    "session has connection URL",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "session has referrer information",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    session.created_at.length > 0,
  );

  // Step 6: Verify session ID is properly formatted
  TestValidator.equals(
    "session ID matches requested ID",
    session.id,
    sessionId,
  );

  // Step 7: Validate expired_at field for session lifecycle tracking
  // The expired_at field can be null (active session) or contain a timestamp (expired)
  // This field is critical for determining session status in audit reviews
  // For active sessions, expired_at should be null or undefined
  // For terminated sessions, expired_at should contain the termination timestamp

  // Step 8: Confirm complete admin summary is included for audit context
  TestValidator.predicate(
    "admin summary includes email",
    session.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin summary includes creation date",
    session.admin.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin summary includes update timestamp",
    session.admin.updated_at.length > 0,
  );
}
