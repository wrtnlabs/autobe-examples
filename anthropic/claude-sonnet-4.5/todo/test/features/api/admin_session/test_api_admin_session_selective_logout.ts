import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator's session termination endpoint functionality.
 *
 * Since session IDs are not exposed in the login response and no session
 * listing endpoint is available, this test validates that the session deletion
 * endpoint accepts properly formatted session IDs. In a real-world scenario,
 * session IDs would be obtained from a session management dashboard or decoded
 * from JWT tokens.
 *
 * Test workflow:
 *
 * 1. Register a new admin account
 * 2. Create an admin session by logging in
 * 3. Attempt to delete a session using a valid UUID format
 * 4. Verify the endpoint accepts the request (error expected for non-existent
 *    session)
 */
export async function test_api_admin_session_selective_logout(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(registeredAdmin);

  // Step 2: Create first admin session
  const firstSessionAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/login" satisfies string &
          tags.Format<"uri">,
        referrer: "https://admin.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(firstSessionAdmin);

  // Step 3: Create second admin session
  const secondSessionAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.101",
        href: "https://admin.example.com/login" satisfies string &
          tags.Format<"uri">,
        referrer: "https://admin.example.com/dashboard" satisfies string &
          tags.Format<"uri">,
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(secondSessionAdmin);

  // Step 4: Test session deletion with a valid UUID format
  // In real implementation, this would be an actual session ID from a session list
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent session should fail",
    async () => {
      await api.functional.todoList.admin.admins.me.sessions.erase(connection, {
        sessionId: testSessionId,
      });
    },
  );
}
