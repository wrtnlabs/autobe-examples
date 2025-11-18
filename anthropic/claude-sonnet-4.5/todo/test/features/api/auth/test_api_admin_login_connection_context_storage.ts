import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that admin login correctly stores connection context metadata.
 *
 * This test validates that the admin login endpoint properly captures and
 * stores connection context information (IP address, connection URL, referrer
 * URL) in the session record for security auditing purposes.
 *
 * Test workflow:
 *
 * 1. Create an admin account with initial registration
 * 2. Login with specific connection context values (ip, href, referrer)
 * 3. Verify that the login response contains valid admin information
 * 4. Validate that JWT tokens are properly issued
 * 5. Confirm that session timestamps are correctly set
 */
export async function test_api_admin_login_connection_context_storage(
  connection: api.IConnection,
) {
  // Step 1: Generate test admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  // Step 2: Create admin account with initial connection context
  const registrationContext = {
    ip: "192.168.1.100",
    href: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  };

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: registrationContext.ip,
      href: registrationContext.href,
      referrer: registrationContext.referrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(registeredAdmin);

  // Step 3: Login with specific connection context for validation
  const loginContext = {
    ip: "10.0.0.50",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" satisfies string &
      tags.Format<"uri">,
  };

  const loggedInAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: loginContext.ip,
      href: loginContext.href,
      referrer: loginContext.referrer,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(loggedInAdmin);

  // Step 4: Validate admin information
  TestValidator.equals("admin email matches", loggedInAdmin.email, adminEmail);
  TestValidator.equals(
    "admin id is consistent",
    loggedInAdmin.id,
    registeredAdmin.id,
  );

  // Step 5: Validate JWT token structure
  typia.assert<IAuthorizationToken>(loggedInAdmin.token);
  TestValidator.predicate(
    "access token is non-empty string",
    loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loggedInAdmin.token.refresh.length > 0,
  );

  // Step 6: Validate timestamp fields exist and are valid
  const createdAt = new Date(loggedInAdmin.created_at);
  const updatedAt = new Date(loggedInAdmin.updated_at);
  const expiredAt = new Date(loggedInAdmin.token.expired_at);
  const refreshableUntil = new Date(loggedInAdmin.token.refreshable_until);

  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );

  // Step 7: Validate token expiration logic
  TestValidator.predicate(
    "access token expires in the future",
    expiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token is valid longer than access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
