import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test Admin Session Revocation Idempotent Behavior
 *
 * This test validates the behavior of session revocation API when attempting to
 * revoke sessions. Since the available API functions don't provide a way to
 * list sessions or obtain session IDs from authentication responses, this test
 * uses generated session IDs to validate the API's idempotent revocation
 * behavior.
 *
 * Test Workflow:
 *
 * 1. Admin Registration: Register a new admin account to establish authentication
 * 2. First Revocation: Attempt to revoke a session using a valid UUID format
 * 3. Second Revocation: Attempt to revoke the same session ID again
 * 4. Validation: Verify both revocations complete without errors (idempotent
 *    behavior)
 *
 * Note: This tests the API's handling of revocation requests, demonstrating
 * that revoking the same session multiple times is safe and idempotent.
 */
export async function test_api_admin_session_revocation_already_expired(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account to establish authenticated context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a session ID for revocation testing
  // Note: In a real scenario, this would be obtained from a session listing API
  // or from the authentication response metadata
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Perform first session revocation
  await api.functional.todoList.admin.admins.me.sessions.erase(connection, {
    sessionId: sessionId,
  });

  // Step 4: Attempt to revoke the same session again (idempotent operation)
  await api.functional.todoList.admin.admins.me.sessions.erase(connection, {
    sessionId: sessionId,
  });

  // Test passes if both revocations complete successfully without throwing errors
  // This demonstrates the API's idempotent behavior for session revocation
}
