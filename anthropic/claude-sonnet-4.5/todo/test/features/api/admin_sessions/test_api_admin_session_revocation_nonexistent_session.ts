import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test non-existent session revocation error handling.
 *
 * Validates that attempting to revoke a session ID that doesn't exist in the
 * database returns an appropriate error response. This test ensures proper
 * error handling when admins provide invalid session IDs.
 *
 * Workflow:
 *
 * 1. Register a new admin account to establish authentication context
 * 2. Generate a valid UUID that doesn't correspond to any existing session
 * 3. Attempt to revoke the non-existent session
 * 4. Verify the API throws an error indicating the session was not found
 */
export async function test_api_admin_session_revocation_nonexistent_session(
  connection: api.IConnection,
) {
  // Step 1: Register admin account and establish authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdminPass123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/login",
      ip: "192.168.1.100",
    } satisfies ITodoListAdmin.ICreate,
  });

  typia.assert(admin);

  // Step 2: Generate a valid UUID that doesn't exist in the database
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to revoke non-existent session and verify error
  await TestValidator.error(
    "should throw error when revoking non-existent session",
    async () => {
      await api.functional.todoList.admin.admins.me.sessions.erase(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
