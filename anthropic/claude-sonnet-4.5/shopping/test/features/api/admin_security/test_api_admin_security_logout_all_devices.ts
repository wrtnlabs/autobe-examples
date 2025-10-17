import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the complete security reset workflow where an admin logs out from all
 * devices simultaneously.
 *
 * This test validates the comprehensive session termination feature where all
 * active admin sessions across multiple devices are revoked in a single
 * operation. The workflow simulates an admin creating multiple sessions (as if
 * logging in from different devices), then performing a complete logout that
 * terminates all sessions at once.
 *
 * Test Steps:
 *
 * 1. Create a new admin account with random credentials
 * 2. Simulate multiple device sessions by performing additional login operations
 *    with the same credentials
 * 3. Execute the logout from all devices operation to revoke all sessions
 * 4. Validate the response confirms all sessions were revoked with the correct
 *    count
 *
 * This test ensures the critical security feature for account compromise
 * scenarios where admins need to immediately terminate all access points and
 * force re-authentication everywhere.
 */
export async function test_api_admin_security_logout_all_devices(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account to establish initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const roleLevel = "super_admin";

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role_level: roleLevel,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  TestValidator.equals("admin email matches", createdAdmin.email, adminEmail);
  TestValidator.equals("admin name matches", createdAdmin.name, adminName);
  TestValidator.equals(
    "admin role matches",
    createdAdmin.role_level,
    roleLevel,
  );

  // Step 2: Simulate multiple device sessions by logging in 3 additional times
  // This creates multiple active sessions for the same admin account
  const session1 = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(session1);

  const session2 = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(session2);

  const session3 = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(session3);

  // Verify each login created a valid session with tokens
  TestValidator.equals(
    "session 1 admin ID matches",
    session1.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "session 2 admin ID matches",
    session2.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "session 3 admin ID matches",
    session3.id,
    createdAdmin.id,
  );

  // Step 3: Execute the logout from all devices operation
  // This should revoke all 4 sessions (1 from join + 3 from logins)
  const logoutResult =
    await api.functional.auth.admin.sessions.all.revokeAllSessions(connection);
  typia.assert(logoutResult);

  // Step 4: Validate the logout operation was successful
  TestValidator.predicate(
    "logout message indicates success",
    logoutResult.message.length > 0,
  );

  TestValidator.equals(
    "sessions revoked count matches expected",
    logoutResult.sessions_revoked,
    4,
  );

  // Verify sessions_revoked is a positive number
  TestValidator.predicate(
    "sessions revoked count is positive",
    logoutResult.sessions_revoked > 0,
  );
}
