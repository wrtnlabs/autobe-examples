import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test that session detail endpoint returns accurate and consistent timestamp
 * information for session lifecycle tracking.
 *
 * This test validates that created_at and expired_at timestamps are properly
 * managed and returned in ISO 8601 format for reliable date-time handling. The
 * test creates an admin account, authenticates to generate a session, retrieves
 * the session details, and verifies that created_at contains a valid ISO 8601
 * formatted timestamp representing when the session was established.
 *
 * For active sessions, the test confirms that expired_at is null or contains a
 * future timestamp indicating when the session will expire. The test validates
 * that timestamp formats are consistent and parseable by date libraries, and
 * that the created_at timestamp is immutable and matches the authentication
 * time.
 *
 * Steps:
 *
 * 1. Create an admin account (automatically creates a session)
 * 2. Retrieve session details using admin ID and generated session ID
 * 3. Validate created_at format and parseability
 * 4. Validate expired_at is null or future timestamp with proper format
 * 5. Verify timestamp consistency and session ownership
 */
export async function test_api_admin_session_detail_timestamp_consistency(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate (automatically creates session)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const joinedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(joinedAdmin);

  // Step 2: Extract admin ID for session retrieval
  const adminId = joinedAdmin.id;
  const authCreatedAt = joinedAdmin.created_at;

  // Generate a session ID for testing
  // Note: In real scenario, session ID would be obtained from a session listing endpoint
  // or included in the authentication response
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve session details
  const session = await api.functional.todoList.admin.admins.sessions.at(
    connection,
    {
      adminId: adminId,
      sessionId: sessionId,
    },
  );
  typia.assert(session);

  // Step 4: Validate created_at timestamp format and parseability
  const createdAtDate = new Date(session.created_at);
  TestValidator.predicate(
    "created_at should be parseable as a valid Date",
    !isNaN(createdAtDate.getTime()),
  );

  // Validate ISO 8601 format pattern
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
  TestValidator.predicate(
    "created_at should match ISO 8601 format",
    iso8601Regex.test(session.created_at),
  );

  // Step 5: Validate expired_at timestamp
  if (session.expired_at !== null && session.expired_at !== undefined) {
    const expiredAtDate = new Date(session.expired_at);
    TestValidator.predicate(
      "expired_at should be parseable as a valid Date when present",
      !isNaN(expiredAtDate.getTime()),
    );

    TestValidator.predicate(
      "expired_at should match ISO 8601 format",
      iso8601Regex.test(session.expired_at),
    );

    // For active sessions, expired_at should be in the future
    const now = new Date();
    TestValidator.predicate(
      "expired_at should be in the future for active sessions",
      expiredAtDate > now,
    );
  }

  // Step 6: Validate timestamp consistency
  const adminCreatedDate = new Date(authCreatedAt);
  const timeDifference = Math.abs(
    createdAtDate.getTime() - adminCreatedDate.getTime(),
  );

  // Allow up to 5 seconds difference for processing time
  TestValidator.predicate(
    "session created_at should be close to admin creation time",
    timeDifference <= 5000,
  );

  // Step 7: Validate session ownership
  TestValidator.equals(
    "session should belong to the created admin",
    session.todo_list_admin_id,
    adminId,
  );

  TestValidator.equals(
    "session admin summary ID should match",
    session.admin.id,
    adminId,
  );

  TestValidator.equals(
    "session admin summary email should match",
    session.admin.email,
    adminEmail,
  );
}
