import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSessionRevocationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSessionRevocationSummary";

/**
 * Test bulk session revocation when admin has no active sessions.
 *
 * This test validates the edge case where an admin performs bulk session
 * revocation when they have no currently active sessions (all sessions were
 * previously expired or revoked). The test ensures the system correctly handles
 * this unusual but valid scenario by returning accurate revocation counts and
 * proper notification status.
 *
 * The workflow follows these steps:
 *
 * 1. Register a new admin account via POST /auth/admin/join
 * 2. Perform first bulk revocation via DELETE /todoList/admin/admins/me/sessions
 *    to expire the initial session
 * 3. Login again via POST /auth/admin/login to create a new session
 * 4. Perform second bulk revocation via DELETE /todoList/admin/admins/me/sessions
 *    to expire this session
 * 5. Login once more via POST /auth/admin/login to obtain a valid access token
 * 6. Call DELETE /todoList/admin/admins/me/sessions again
 * 7. Verify the response shows revoked_count equals 1 (only the current session
 *    from the final login)
 * 8. Verify notification_sent is true
 *
 * This test validates:
 *
 * - System correctly handles scenarios with varying session states across
 *   multiple revocation cycles
 * - Revoked count accurately reflects only active sessions at revocation time
 * - Operation succeeds even when session count is minimal (single session)
 * - Proper notification is sent for security actions
 */
export async function test_api_admin_session_bulk_revocation_no_active_sessions(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";
  const adminCreateData = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.100",
    href: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ICreate;

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(registeredAdmin);

  // Step 2: Perform first bulk revocation to expire the initial session
  const firstRevocation: ITodoListAdminSessionRevocationSummary =
    await api.functional.todoList.admin.admins.me.sessions.eraseAll(connection);
  typia.assert(firstRevocation);
  TestValidator.equals(
    "first revocation count should be 1",
    firstRevocation.revoked_count,
    1,
  );

  // Step 3: Login again to create a new session
  const loginData1 = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.101",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  const loggedInAdmin1: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginData1,
    });
  typia.assert(loggedInAdmin1);

  // Step 4: Perform second bulk revocation to expire this session
  const secondRevocation: ITodoListAdminSessionRevocationSummary =
    await api.functional.todoList.admin.admins.me.sessions.eraseAll(connection);
  typia.assert(secondRevocation);
  TestValidator.equals(
    "second revocation count should be 1",
    secondRevocation.revoked_count,
    1,
  );

  // Step 5: Login once more to obtain a valid access token
  const loginData2 = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.102",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  const loggedInAdmin2: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginData2,
    });
  typia.assert(loggedInAdmin2);

  // Step 6: Call bulk revocation again
  const thirdRevocation: ITodoListAdminSessionRevocationSummary =
    await api.functional.todoList.admin.admins.me.sessions.eraseAll(connection);
  typia.assert(thirdRevocation);

  // Step 7: Verify the response shows revoked_count equals 1
  TestValidator.equals(
    "third revocation count should be 1",
    thirdRevocation.revoked_count,
    1,
  );

  // Step 8: Verify notification_sent is true
  TestValidator.equals(
    "notification should be sent",
    thirdRevocation.notification_sent,
    true,
  );
}
