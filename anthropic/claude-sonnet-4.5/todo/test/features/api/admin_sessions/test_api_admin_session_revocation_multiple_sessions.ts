import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test session revocation when an admin has multiple active sessions from
 * different devices or browsers.
 *
 * This test validates the bulk session revocation capability of the admin
 * session management system. The scenario simulates a real-world use case where
 * an administrator has logged in from multiple devices (such as a desktop
 * browser, mobile device, and tablet) and needs to revoke all sessions
 * simultaneously for security purposes.
 *
 * Test workflow:
 *
 * 1. Create a new admin account through the join endpoint
 * 2. Simulate multiple concurrent login sessions by calling the admin login
 *    endpoint multiple times
 * 3. Call the revoke all sessions endpoint to invalidate all active sessions
 * 4. Verify that the operation completes successfully
 */
export async function test_api_admin_session_revocation_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdminPass123!";

  const adminRegistration = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.100",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/home",
  } satisfies ITodoListAdmin.ICreate;

  const initialAdmin = await api.functional.auth.admin.join(connection, {
    body: adminRegistration,
  });
  typia.assert(initialAdmin);

  // Step 2: Simulate multiple login sessions from different devices
  const deviceCount = 5;
  const loginSessions = await ArrayUtil.asyncRepeat(
    deviceCount,
    async (index) => {
      const deviceTypes = [
        "desktop",
        "mobile",
        "tablet",
        "laptop",
        "smartwatch",
      ];
      const deviceType = deviceTypes[index % deviceTypes.length];

      const loginRequest = {
        email: adminEmail,
        password: adminPassword,
        ip: `192.168.1.${100 + index}`,
        href: `https://admin.example.com/${deviceType}/dashboard`,
        referrer: `https://admin.example.com/${deviceType}/login`,
      } satisfies ITodoListAdmin.ILogin;

      const session = await api.functional.auth.admin.login(connection, {
        body: loginRequest,
      });
      typia.assert(session);

      return session;
    },
  );

  // Verify that multiple sessions were created
  TestValidator.equals(
    "multiple sessions created successfully",
    loginSessions.length,
    deviceCount,
  );

  // Verify all sessions have valid tokens
  loginSessions.forEach((session, index) => {
    TestValidator.predicate(
      `session ${index + 1} has valid access token`,
      session.token.access.length > 0,
    );
    TestValidator.predicate(
      `session ${index + 1} has valid refresh token`,
      session.token.refresh.length > 0,
    );
  });

  // Step 3: Revoke all sessions for the admin
  await api.functional.todoList.admin.admins.me.sessions.revokeAll(connection);

  // Step 4: Verify the revocation completed successfully
  // The endpoint returns void on success, so if we reach here without error, it succeeded
  TestValidator.predicate("revoke all sessions completed without errors", true);
}
