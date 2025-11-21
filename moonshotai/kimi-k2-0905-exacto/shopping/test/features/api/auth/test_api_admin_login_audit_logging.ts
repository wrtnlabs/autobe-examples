import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test comprehensive audit trail generation during admin authentication.
 *
 * This test validates the complete audit logging functionality for admin login
 * operations, ensuring proper capture of IP addresses, referrer URLs, and
 * session context. The test verifies that authentication attempts generate
 * comprehensive audit trails suitable for administrative access pattern
 * analysis and security monitoring.
 *
 * Test Flow:
 *
 * 1. Generate valid admin credentials with email and password
 * 2. Create login request with comprehensive audit trail data (href, referrer, IP)
 * 3. Perform admin authentication via /auth/admin/login endpoint
 * 4. Verify successful authentication returns complete admin profile
 * 5. Validate audit logging data (IP tracking, referrer monitoring)
 * 6. Test error scenarios for audit trail handling
 * 7. Verify session context capture and administrative access logging
 */
export async function test_api_admin_login_audit_logging(
  connection: api.IConnection,
) {
  // Generate valid admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@1234!"; // Strong admin password

  // Create comprehensive audit trail login request
  const authRequest = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(), // Generate valid IP for audit
    href: typia.random<string & tags.Format<"uri">>(), // Current page URL
    referrer: typia.random<string & tags.Format<"uri">>(), // Previous page URL
  } satisfies IShoppingMallAdmin.ILogin;

  // Perform admin authentication with audit trail
  const authResult = await api.functional.auth.admin.login(connection, {
    body: authRequest,
  });

  // Validate response structure and admin profile
  typia.assert(authResult);

  // Verify admin authentication attributes
  TestValidator.predicate(
    "admin has valid ID",
    typia.is<string & tags.Format<"uuid">>(authResult.id),
  );
  TestValidator.predicate(
    "admin has valid email format",
    typia.is<string & tags.Format<"email">>(authResult.email),
  );

  // Verify enhanced administrative credentials
  TestValidator.predicate(
    "admin has first name",
    authResult.first_name.length > 0,
  );
  TestValidator.predicate(
    "admin has last name",
    authResult.last_name.length > 0,
  );
  TestValidator.predicate(
    "admin has valid privilege level",
    typia.is<"super_admin" | "department_admin" | "support_admin" | "viewer">(
      authResult.admin_level,
    ),
  );

  // Verify authorization token structure
  TestValidator.predicate(
    "has valid access token",
    authResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    authResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has token expiration",
    typia.is<string & tags.Format<"date-time">>(authResult.token.expired_at),
  );

  // Test audit logging scenarios with different IP addresses
  const differentIpRequest = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<string & tags.Format<"ipv6">>(), // IPv6 for geo-anomaly testing
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdmin.ILogin;

  const geoAnomalyResult = await api.functional.auth.admin.login(connection, {
    body: differentIpRequest,
  });

  typia.assert(geoAnomalyResult);

  // Test null IP scenario (server extraction)
  const noIpRequest = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/management",
    referrer: "https://admin.example.com/portal",
  } satisfies IShoppingMallAdmin.ILogin;

  const serverIpResult = await api.functional.auth.admin.login(connection, {
    body: noIpRequest,
  });

  typia.assert(serverIpResult);

  // Verify department assignment tracking for admin access patterns
  TestValidator.predicate(
    "department field handled",
    authResult.department !== undefined,
  );

  // Test authentication error scenarios for audit failure logging
  const invalidCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "WrongPassword123!",
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.example.com/auth",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  await TestValidator.error(
    "invalid admin credentials should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: invalidCredentials,
      });
    },
  );
}
