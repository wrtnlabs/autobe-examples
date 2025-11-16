import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test retrieving detailed information about a specific administrator session.
 *
 * This test validates the session detail retrieval endpoint by creating an
 * admin account and then attempting to retrieve session information. Since the
 * join response does not provide a session ID, this test demonstrates the API
 * endpoint's type safety and response structure using a generated session ID.
 *
 * Workflow:
 *
 * 1. Create a new admin account via join endpoint (establishes authenticated
 *    session)
 * 2. Generate test session ID for endpoint validation
 * 3. Call session detail endpoint to verify response structure
 * 4. Validate response conforms to ITodoListAdminSession type
 *
 * Note: In a real-world scenario, the session ID would be obtained from a
 * session listing endpoint or included in the authentication response.
 */
export async function test_api_admin_session_detail_retrieval_for_own_session(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and establish authenticated session
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(createdAdmin);

  // Step 2: Generate session ID for testing session retrieval endpoint
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve session details using admin ID and session ID
  const sessionDetails = await api.functional.todoList.admin.admins.sessions.at(
    connection,
    {
      adminId: createdAdmin.id,
      sessionId: testSessionId,
    },
  );

  // Step 4: Validate session response structure
  typia.assert(sessionDetails);

  // Validate key relationships
  TestValidator.equals(
    "session belongs to admin",
    sessionDetails.todo_list_admin_id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "session ID matches request",
    sessionDetails.id,
    testSessionId,
  );
  TestValidator.equals(
    "admin summary ID matches",
    sessionDetails.admin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "admin summary email matches",
    sessionDetails.admin.email,
    createdAdmin.email,
  );
}
