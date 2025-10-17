import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test admin self-session revocation functionality.
 *
 * This test validates that an admin can revoke their own current session,
 * effectively logging themselves out. The test creates a new admin account,
 * retrieves the active session information, revokes the current session, and
 * verifies that subsequent API requests fail with authentication errors.
 *
 * Test Flow:
 *
 * 1. Create a new admin account (automatically authenticated)
 * 2. Retrieve active sessions to identify current session ID
 * 3. Revoke the current session
 * 4. Verify revocation success
 * 5. Confirm that revoked session cannot be used for API requests
 */
export async function test_api_admin_session_self_revocation(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "order_manager",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Verify admin account creation
  TestValidator.equals("admin email matches", admin.email, adminData.email);
  TestValidator.equals("admin name matches", admin.name, adminData.name);
  TestValidator.equals(
    "admin role matches",
    admin.role_level,
    adminData.role_level,
  );
  typia.assert(admin.token);

  // Step 2: Retrieve active sessions
  const sessionList: IShoppingMallAdmin.ISessionList =
    await api.functional.auth.admin.sessions.listSessions(connection);
  typia.assert(sessionList);

  // Verify session list structure
  TestValidator.predicate(
    "session list should have at least one session",
    sessionList.sessions.length > 0,
  );
  TestValidator.equals(
    "total count matches sessions length",
    sessionList.total_count,
    sessionList.sessions.length,
  );

  // Step 3: Get the current session ID (should be the first/most recent one)
  const currentSession = sessionList.sessions[0];
  typia.assert(currentSession);
  typia.assert(currentSession.id);

  // Step 4: Revoke the current session
  const revokeResponse: IShoppingMallAdmin.ISessionRevokeResponse =
    await api.functional.auth.admin.sessions.revokeSession(connection, {
      sessionId: currentSession.id,
    });
  typia.assert(revokeResponse);

  // Step 5: Verify that subsequent requests fail with revoked session
  await TestValidator.error(
    "should fail to list sessions with revoked token",
    async () => {
      await api.functional.auth.admin.sessions.listSessions(connection);
    },
  );
}
