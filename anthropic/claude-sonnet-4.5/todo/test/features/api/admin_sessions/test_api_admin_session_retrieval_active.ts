import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test successful retrieval of active administrator session details.
 *
 * This test validates the session retrieval endpoint by creating a new
 * administrator account (which establishes an initial session) and then
 * attempting to retrieve session details.
 *
 * Note: This test validates the session retrieval endpoint structure and
 * response format. The actual session validation is limited because the API
 * does not provide a mechanism to obtain the session ID created during the join
 * operation.
 *
 * The test verifies:
 *
 * 1. Admin registration successfully creates an authenticated session
 * 2. Session retrieval endpoint accepts valid UUID session IDs
 * 3. Retrieved session response structure is correct
 * 4. Active sessions have null expired_at value
 * 5. All required session fields are properly typed
 */
export async function test_api_admin_session_retrieval_active(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account which establishes initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureP@ssw0rd123";
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const createAdminBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.100",
    href: connectionHref,
    referrer: connectionReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: createAdminBody,
  });
  typia.assert(admin);

  // Validate admin creation response
  TestValidator.equals("admin email matches input", admin.email, adminEmail);

  // Step 2: Retrieve session details using a session ID
  // Note: The API structure does not provide the session ID from join response,
  // so we use a randomly generated UUID. In a real scenario, the session ID
  // would be obtained from the join operation or a sessions listing endpoint.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session = await api.functional.todoList.admin.admins.me.sessions.at(
    connection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);

  // Validate session structure - typia.assert already validated all types,
  // formats, and required fields, so we only check business logic
  TestValidator.equals(
    "active session has null expired_at",
    session.expired_at,
    null,
  );
}
