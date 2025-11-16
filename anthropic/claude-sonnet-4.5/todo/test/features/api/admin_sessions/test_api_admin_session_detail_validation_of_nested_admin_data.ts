import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validates that session detail endpoint returns complete nested administrator
 * summary information.
 *
 * This test ensures that the API properly includes related admin data within
 * the session object, eliminating the need for separate API calls to fetch
 * administrator information. The test creates an admin account, authenticates
 * to generate a session, retrieves the session details, and verifies that all
 * required summary fields are present and correctly populated.
 *
 * Steps:
 *
 * 1. Create an admin account with random credentials
 * 2. Authenticate and obtain admin information with JWT tokens
 * 3. Retrieve session details using admin ID and session ID
 * 4. Verify nested admin summary data matches the authenticated administrator's
 *    information
 * 5. Validate foreign key relationship (todo_list_admin_id matches admin.id)
 */
export async function test_api_admin_session_detail_validation_of_nested_admin_data(
  connection: api.IConnection,
) {
  // Step 1: Generate random admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create admin account and authenticate
  const createBody = {
    email: adminEmail,
    password: adminPassword,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: createBody,
  });
  typia.assert(authorizedAdmin);

  // Step 3: Extract admin ID from the authorized response
  const adminId = authorizedAdmin.id;

  // Step 4: Generate session ID for testing
  // Note: The join endpoint creates a session but doesn't return the session ID directly.
  // In a real test environment, we would retrieve the actual session ID from the database
  // or from a session listing endpoint. For this test, we use a random UUID to simulate
  // the session retrieval flow.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Retrieve session details
  const session = await api.functional.todoList.admin.admins.sessions.at(
    connection,
    {
      adminId: adminId,
      sessionId: sessionId,
    },
  );
  typia.assert(session);

  // Step 6: Verify nested admin data matches the created admin
  TestValidator.equals(
    "nested admin id should match authorized admin id",
    session.admin.id,
    authorizedAdmin.id,
  );

  TestValidator.equals(
    "nested admin email should match authorized admin email",
    session.admin.email,
    authorizedAdmin.email,
  );

  // Step 7: Validate foreign key relationship
  TestValidator.equals(
    "session todo_list_admin_id should match nested admin id",
    session.todo_list_admin_id,
    session.admin.id,
  );
}
