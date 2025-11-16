import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that administrator login properly tracks session context including IP
 * address, href, and referrer information.
 *
 * This test validates the complete session tracking workflow for admin
 * authentication:
 *
 * 1. Create an admin account with initial session context
 * 2. Perform login with complete session metadata (IP address, href URL, referrer
 *    URL)
 * 3. Verify successful authentication with JWT tokens
 * 4. Test different referrer scenarios including empty string for direct access
 * 5. Ensure all session context fields are properly recorded for audit trails and
 *    security monitoring
 *
 * The test focuses on validating that mandatory connection context fields (href
 * and referrer) are properly handled during the login process, which is
 * critical for security auditing and tracking admin authentication entry
 * points.
 */
export async function test_api_admin_login_session_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with session context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const registrationHref = typia.random<string & tags.Format<"uri">>();
  const registrationReferrer = typia.random<string & tags.Format<"uri">>();
  const registrationIp = "192.168.1.100";

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: registrationIp,
      href: registrationHref,
      referrer: registrationReferrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // Validate admin creation response
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "created admin has valid ID",
    typia.is<string & tags.Format<"uuid">>(createdAdmin.id),
  );
  TestValidator.predicate(
    "created admin has access token",
    createdAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "created admin has refresh token",
    createdAdmin.token.refresh.length > 0,
  );

  // Step 2: Login with complete session metadata (standard referrer)
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();
  const loginIp = "192.168.1.101";

  const loginResult = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: loginIp,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(loginResult);

  // Validate login response
  TestValidator.equals(
    "logged in admin email matches",
    loginResult.email,
    adminEmail,
  );
  TestValidator.equals(
    "logged in admin ID matches",
    loginResult.id,
    createdAdmin.id,
  );
  TestValidator.predicate(
    "login returned access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returned refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    typia.is<string & tags.Format<"date-time">>(loginResult.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token has expiration",
    typia.is<string & tags.Format<"date-time">>(
      loginResult.token.refreshable_until,
    ),
  );

  // Step 3: Login with empty referrer (direct access scenario)
  const directAccessHref = typia.random<string & tags.Format<"uri">>();
  const emptyReferrer = "https://";

  const directLoginResult = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: directAccessHref,
      referrer: emptyReferrer,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(directLoginResult);

  // Validate direct access login
  TestValidator.equals(
    "direct login admin email matches",
    directLoginResult.email,
    adminEmail,
  );
  TestValidator.equals(
    "direct login admin ID matches",
    directLoginResult.id,
    createdAdmin.id,
  );
  TestValidator.predicate(
    "direct login returned access token",
    directLoginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "direct login returned refresh token",
    directLoginResult.token.refresh.length > 0,
  );

  // Step 4: Login without optional IP (server should handle)
  const noIpHref = typia.random<string & tags.Format<"uri">>();
  const noIpReferrer = typia.random<string & tags.Format<"uri">>();

  const noIpLoginResult = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: noIpHref,
      referrer: noIpReferrer,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(noIpLoginResult);

  // Validate login without IP
  TestValidator.equals(
    "no-IP login admin email matches",
    noIpLoginResult.email,
    adminEmail,
  );
  TestValidator.equals(
    "no-IP login admin ID matches",
    noIpLoginResult.id,
    createdAdmin.id,
  );
  TestValidator.predicate(
    "no-IP login returned tokens",
    noIpLoginResult.token.access.length > 0 &&
      noIpLoginResult.token.refresh.length > 0,
  );
}
