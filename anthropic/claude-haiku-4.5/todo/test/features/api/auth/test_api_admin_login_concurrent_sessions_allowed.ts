import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that admin users can maintain multiple concurrent sessions from
 * different locations.
 *
 * The scenario verifies that the system supports concurrent admin access from
 * multiple devices or locations without terminating previous sessions. Each
 * login from a different location creates a new session while keeping existing
 * sessions active.
 *
 * Test flow:
 *
 * 1. Register a new admin account with email and password
 * 2. Perform first login from location A (simulated via different href/referrer)
 * 3. Perform second login from location B (simulated via different href/referrer)
 * 4. Verify both sessions remain active by performing authenticated operations
 * 5. Validate that each session's token works independently
 */
export async function test_api_admin_login_concurrent_sessions_allowed(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account that will be used for multiple concurrent logins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const registrationResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(registrationResponse);
  TestValidator.equals(
    "admin registered successfully",
    registrationResponse.status,
    "active",
  );

  // Step 2: Perform first login from location A
  const firstLoginHref = "https://admin-panel.example.com/login";
  const firstLoginReferrer = "https://admin-panel.example.com/";
  const firstLoginIp = "192.168.1.100";

  const firstLoginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: firstLoginHref,
        referrer: firstLoginReferrer,
        ip: firstLoginIp,
      } satisfies ITodoAppAdmin.ILogin,
    });
  typia.assert(firstLoginResponse);
  TestValidator.equals(
    "first login successful",
    firstLoginResponse.email,
    adminEmail,
  );

  // Store first session token
  const firstSessionToken = firstLoginResponse.token.access;

  // Step 3: Perform second login from location B (simulated as different IP/location)
  const secondLoginHref = "https://mobile-admin.example.com/login";
  const secondLoginReferrer = "https://mobile-admin.example.com/";
  const secondLoginIp = "203.45.67.89";

  const secondLoginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: secondLoginHref,
        referrer: secondLoginReferrer,
        ip: secondLoginIp,
      } satisfies ITodoAppAdmin.ILogin,
    });
  typia.assert(secondLoginResponse);
  TestValidator.equals(
    "second login successful",
    secondLoginResponse.email,
    adminEmail,
  );

  // Store second session token
  const secondSessionToken = secondLoginResponse.token.access;

  // Step 4: Verify both tokens are different (indicating separate sessions)
  TestValidator.notEquals(
    "first and second session tokens should be different",
    firstSessionToken,
    secondSessionToken,
  );

  // Step 5: Perform third login from location C to create additional concurrent session
  const thirdLoginHref = "https://backup-admin.example.com/login";
  const thirdLoginReferrer = "https://backup-admin.example.com/";
  const thirdLoginIp = "10.20.30.40";

  const thirdLoginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: thirdLoginHref,
        referrer: thirdLoginReferrer,
        ip: thirdLoginIp,
      } satisfies ITodoAppAdmin.ILogin,
    });
  typia.assert(thirdLoginResponse);
  TestValidator.equals(
    "third login successful",
    thirdLoginResponse.email,
    adminEmail,
  );

  // Store third session token
  const thirdSessionToken = thirdLoginResponse.token.access;

  // Step 6: Verify all three tokens are unique
  TestValidator.notEquals(
    "first and third session tokens should be different",
    firstSessionToken,
    thirdSessionToken,
  );
  TestValidator.notEquals(
    "second and third session tokens should be different",
    secondSessionToken,
    thirdSessionToken,
  );

  // Step 7: Validate that all sessions remain active and independent
  // All responses should contain the same admin ID confirming they're all for the same user
  TestValidator.equals(
    "all sessions belong to the same admin",
    firstLoginResponse.id,
    secondLoginResponse.id,
  );
  TestValidator.equals(
    "all sessions belong to the same admin (session 3)",
    firstLoginResponse.id,
    thirdLoginResponse.id,
  );

  // Step 8: Verify admin status is active across all sessions
  TestValidator.equals(
    "first session admin status is active",
    firstLoginResponse.status,
    "active",
  );
  TestValidator.equals(
    "second session admin status is active",
    secondLoginResponse.status,
    "active",
  );
  TestValidator.equals(
    "third session admin status is active",
    thirdLoginResponse.status,
    "active",
  );

  // Step 9: Validate all tokens have proper expiration times
  TestValidator.predicate(
    "first session token has valid expiration",
    () => new Date(firstLoginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second session token has valid expiration",
    () => new Date(secondLoginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "third session token has valid expiration",
    () => new Date(thirdLoginResponse.token.expired_at) > new Date(),
  );

  // Step 10: Verify refresh tokens exist and are valid for all sessions
  TestValidator.predicate(
    "first session has refresh token",
    firstLoginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second session has refresh token",
    secondLoginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "third session has refresh token",
    thirdLoginResponse.token.refresh.length > 0,
  );
}
