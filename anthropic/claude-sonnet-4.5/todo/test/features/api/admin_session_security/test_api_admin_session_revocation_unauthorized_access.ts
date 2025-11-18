import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test session revocation with unauthorized session ID access.
 *
 * This test validates that the session revocation endpoint properly handles
 * attempts to revoke sessions that either don't exist or don't belong to the
 * authenticated admin. Due to API limitations (session IDs are not returned in
 * authentication responses), this test validates error handling when attempting
 * to revoke an unknown session ID.
 *
 * Note: The API does not provide session IDs in authentication responses or
 * offer a session listing endpoint, so we cannot test the specific scenario of
 * "Admin B revoking Admin A's actual session". Instead, this test validates
 * that the revocation endpoint properly rejects invalid session ID requests.
 *
 * Workflow:
 *
 * 1. Register first admin account (Admin A)
 * 2. Register second admin account (Admin B)
 * 3. Using Admin B's credentials, attempt to revoke a session with random UUID
 * 4. Verify the operation fails with appropriate error response (404 or 403)
 */
export async function test_api_admin_session_revocation_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Register first admin account (Admin A)
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAPassword = "securePassword123!";
  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/login",
      ip: "192.168.1.100",
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(adminA);

  // Step 2: Register second admin account (Admin B)
  // Admin B will be the authenticated admin attempting the revocation
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBPassword = "anotherSecurePass456!";
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/home",
      ip: "192.168.1.101",
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(adminB);

  // Step 3 & 4: Attempt to revoke a session that doesn't belong to Admin B
  // Note: We use a random UUID since actual session IDs are not accessible
  // This tests that the API properly validates session ownership/existence
  const unknownSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "cannot revoke unknown or unauthorized session",
    async () => {
      await api.functional.todoList.admin.admins.me.sessions.erase(connection, {
        sessionId: unknownSessionId,
      });
    },
  );
}
