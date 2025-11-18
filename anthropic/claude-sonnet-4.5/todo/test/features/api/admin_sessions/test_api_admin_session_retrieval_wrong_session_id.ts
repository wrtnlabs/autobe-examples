import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test session retrieval rejection with invalid session ID.
 *
 * This test validates that the session retrieval endpoint properly rejects
 * requests when provided with a non-existent or invalid session ID. It ensures
 * the API enforces proper session validation and prevents access to sessions
 * that don't exist in the system.
 *
 * Test workflow:
 *
 * 1. Create a new admin account (establishes authentication context)
 * 2. Generate a random UUID that does not correspond to any existing session
 * 3. Attempt to retrieve the session using this invalid session ID
 * 4. Verify that the operation fails with an appropriate error
 */
export async function test_api_admin_session_retrieval_wrong_session_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account to establish authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "securePassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a random UUID that does not correspond to any existing session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to retrieve the session with invalid ID and verify it fails
  await TestValidator.error(
    "should fail to retrieve non-existent session",
    async () => {
      await api.functional.todoList.admin.admins.me.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
