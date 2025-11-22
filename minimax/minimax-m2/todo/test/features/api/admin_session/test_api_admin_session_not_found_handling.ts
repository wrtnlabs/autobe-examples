import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthSession";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test handling of non-existent session IDs during detailed session retrieval.
 *
 * This test validates that the administrative session detail retrieval endpoint
 * properly handles requests for session IDs that don't exist in the system. The
 * test verifies robust error handling and proper HTTP status codes when
 * attempting to retrieve session details for invalid session identifiers.
 *
 * The test workflow includes:
 *
 * 1. Admin authentication to establish valid administrative credentials
 * 2. Attempt to retrieve session details using a non-existent session ID
 *    (generated UUID)
 * 3. Verification that the API properly returns a 404 error response
 * 4. Confirmation that error handling follows expected patterns
 *
 * This ensures that administrative session management endpoints gracefully
 * handle invalid requests and provide appropriate feedback for non-existent
 * resources, maintaining system security and reliability.
 */
export async function test_api_admin_session_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Admin authentication to establish valid administrative credentials
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminTest123!";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to retrieve session details using a non-existent session ID
  const nonExistentSessionId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Verify that the API properly returns a 404 error response
  await TestValidator.error(
    "non-existent session ID should return 404 error",
    async () => {
      await api.functional.todoApp.admin.auth.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
