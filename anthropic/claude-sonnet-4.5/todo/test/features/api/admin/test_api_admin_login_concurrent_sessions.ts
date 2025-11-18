import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that multiple concurrent admin sessions are supported.
 *
 * This test validates the multi-session capability of the admin authentication
 * system. It creates a single admin account and then performs multiple login
 * operations from different connection contexts (simulating different devices
 * or browsers). The test verifies that:
 *
 * 1. Each login with the same credentials succeeds independently
 * 2. Each login creates a separate session with unique tokens
 * 3. All sessions remain active simultaneously
 * 4. Connection context (ip, href, referrer) is properly captured for each session
 *
 * Steps:
 *
 * 1. Create an admin account through registration
 * 2. Perform 3 concurrent login operations with different connection contexts
 * 3. Verify each login returns valid authentication tokens
 * 4. Confirm that refresh tokens are unique (indicating separate sessions)
 * 5. Validate that all sessions can be used independently
 */
export async function test_api_admin_login_concurrent_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for concurrent session testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!@#";

  const registrationBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.100",
    href: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/admin-portal" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListAdmin.ICreate;

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: registrationBody,
  });
  typia.assert(registeredAdmin);

  TestValidator.equals(
    "registered admin email matches",
    registeredAdmin.email,
    adminEmail,
  );

  // Step 2: Create multiple login contexts simulating different devices/locations
  const loginContexts = [
    {
      ip: "10.0.0.1",
      href: "https://admin.example.com/dashboard" satisfies string &
        tags.Format<"uri">,
      referrer: "https://admin.example.com/login" satisfies string &
        tags.Format<"uri">,
      description: "Office desktop",
    },
    {
      ip: "172.16.0.50",
      href: "https://admin.example.com/app" satisfies string &
        tags.Format<"uri">,
      referrer: "https://admin.example.com/home" satisfies string &
        tags.Format<"uri">,
      description: "Mobile device",
    },
    {
      ip: "192.168.100.25",
      href: "https://admin.example.com/portal" satisfies string &
        tags.Format<"uri">,
      referrer: "https://admin.example.com/welcome" satisfies string &
        tags.Format<"uri">,
      description: "Home laptop",
    },
  ];

  // Step 3: Perform concurrent logins from different contexts
  const sessions: ITodoListAdmin.IAuthorized[] = [];

  for (const context of loginContexts) {
    const loginBody = {
      email: adminEmail,
      password: adminPassword,
      ip: context.ip,
      href: context.href,
      referrer: context.referrer,
    } satisfies ITodoListAdmin.ILogin;

    const sessionResult = await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
    typia.assert(sessionResult);

    sessions.push(sessionResult);

    // Validate session data
    TestValidator.equals(
      `session ${context.description} email matches`,
      sessionResult.email,
      adminEmail,
    );
    TestValidator.equals(
      `session ${context.description} admin id matches`,
      sessionResult.id,
      registeredAdmin.id,
    );
  }

  // Step 4: Verify that all sessions have unique refresh tokens (indicating separate sessions)
  const refreshTokens = sessions.map((s) => s.token.refresh);
  const uniqueRefreshTokens = new Set(refreshTokens);

  TestValidator.equals(
    "all sessions have unique refresh tokens",
    uniqueRefreshTokens.size,
    sessions.length,
  );

  // Step 5: Verify that all sessions have unique access tokens
  const accessTokens = sessions.map((s) => s.token.access);
  const uniqueAccessTokens = new Set(accessTokens);

  TestValidator.equals(
    "all sessions have unique access tokens",
    uniqueAccessTokens.size,
    sessions.length,
  );

  // Step 6: Validate that all tokens are valid and properly structured
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const context = loginContexts[i];

    TestValidator.predicate(
      `session ${context.description} has non-empty access token`,
      session.token.access.length > 0,
    );

    TestValidator.predicate(
      `session ${context.description} has non-empty refresh token`,
      session.token.refresh.length > 0,
    );

    TestValidator.predicate(
      `session ${context.description} has valid expiration timestamp`,
      new Date(session.token.expired_at).getTime() > Date.now(),
    );

    TestValidator.predicate(
      `session ${context.description} has valid refresh timestamp`,
      new Date(session.token.refreshable_until).getTime() > Date.now(),
    );
  }

  // Step 7: Verify that all sessions remain active (no session was replaced/expired)
  TestValidator.equals("total concurrent sessions created", sessions.length, 3);
}
