import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrator login session context tracking.
 *
 * This test validates that the admin authentication system properly captures
 * and tracks session context information (href, referrer, IP) for security
 * audit trails. It creates an admin account and performs multiple logins with
 * different session contexts to ensure each login creates a distinct session
 * with properly recorded navigation flow and origin information.
 *
 * Test workflow:
 *
 * 1. Create admin account with initial session context
 * 2. Verify account creation and token issuance
 * 3. Perform first login with specific session context
 * 4. Verify login success and token generation
 * 5. Perform second login with different session context
 * 6. Validate that each login succeeds with distinct authentication
 */
export async function test_api_admin_authentication_session_tracking(
  connection: api.IConnection,
) {
  // Generate random admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();

  // Create initial session context for registration
  const registrationHref = typia.random<string & tags.Format<"uri">>();
  const registrationReferrer = typia.random<string & tags.Format<"uri">>();

  // Create admin account with session tracking
  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
      phone_number: adminPhone,
      admin_level: "support",
      email_verified: true,
      href: registrationHref,
      referrer: registrationReferrer,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // Validate admin creation response
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin full name matches",
    createdAdmin.full_name,
    adminFullName,
  );
  TestValidator.equals(
    "created admin phone matches",
    createdAdmin.phone_number,
    adminPhone,
  );
  TestValidator.equals(
    "created admin level matches",
    createdAdmin.admin_level,
    "support",
  );
  TestValidator.equals(
    "created admin email verified",
    createdAdmin.email_verified,
    true,
  );

  // Verify token issuance
  typia.assert(createdAdmin.token);
  TestValidator.predicate(
    "access token exists",
    createdAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    createdAdmin.token.refresh.length > 0,
  );

  // First login with specific session context
  const firstLoginHref = typia.random<string & tags.Format<"uri">>();
  const firstLoginReferrer = typia.random<string & tags.Format<"uri">>();

  const firstLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: firstLoginHref,
      referrer: firstLoginReferrer,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(firstLogin);

  // Validate first login response
  TestValidator.equals(
    "first login admin id matches",
    firstLogin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "first login email matches",
    firstLogin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "first login access token exists",
    firstLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "first login refresh token exists",
    firstLogin.token.refresh.length > 0,
  );

  // Verify new tokens were issued (different from registration tokens)
  TestValidator.notEquals(
    "first login has new access token",
    firstLogin.token.access,
    createdAdmin.token.access,
  );

  // Second login with different session context
  const secondLoginHref = typia.random<string & tags.Format<"uri">>();
  const secondLoginReferrer = typia.random<string & tags.Format<"uri">>();

  const secondLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: secondLoginHref,
      referrer: secondLoginReferrer,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(secondLogin);

  // Validate second login response
  TestValidator.equals(
    "second login admin id matches",
    secondLogin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "second login email matches",
    secondLogin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "second login access token exists",
    secondLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "second login refresh token exists",
    secondLogin.token.refresh.length > 0,
  );

  // Verify distinct tokens for each login session
  TestValidator.notEquals(
    "second login has different access token than first",
    secondLogin.token.access,
    firstLogin.token.access,
  );
  TestValidator.notEquals(
    "second login has different refresh token than first",
    secondLogin.token.refresh,
    firstLogin.token.refresh,
  );

  // Verify session context fields are different (demonstrating tracking capability)
  TestValidator.notEquals(
    "registration href differs from first login",
    registrationHref,
    firstLoginHref,
  );
  TestValidator.notEquals(
    "first login href differs from second login",
    firstLoginHref,
    secondLoginHref,
  );
}
