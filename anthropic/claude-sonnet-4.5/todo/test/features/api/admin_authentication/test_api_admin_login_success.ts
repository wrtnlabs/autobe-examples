import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful administrator authentication with valid credentials.
 *
 * This test validates the complete admin login workflow:
 *
 * 1. Create a new admin account through the join endpoint
 * 2. Authenticate using the registered credentials with connection context
 * 3. Verify the response contains admin account details and valid JWT tokens
 * 4. Confirm session creation with proper connection metadata
 * 5. Validate access token includes admin role permissions
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // Step 1: Generate random admin credentials for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";
  const connectionContext = {
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  // Step 2: Create admin account through join endpoint
  const joinedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: connectionContext.ip,
        href: connectionContext.href,
        referrer: connectionContext.referrer,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(joinedAdmin);

  // Step 3: Validate joined admin response structure
  TestValidator.equals(
    "joined admin email matches input",
    joinedAdmin.email,
    adminEmail,
  );

  // Step 4: Clear connection headers to simulate fresh login
  const freshConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Authenticate using the registered credentials
  const loginAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(freshConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: connectionContext.ip,
        href: connectionContext.href,
        referrer: connectionContext.referrer,
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(loginAdmin);

  // Step 6: Validate login response contains correct admin information
  TestValidator.equals(
    "login admin id matches joined admin id",
    loginAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "login admin email matches input",
    loginAdmin.email,
    adminEmail,
  );

  // Step 7: Validate JWT token structure and properties
  TestValidator.predicate(
    "access token is non-empty string",
    loginAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loginAdmin.token.refresh.length > 0,
  );

  // Step 8: Verify token expiration logic (expired_at should be before refreshable_until)
  const expiredAt = new Date(loginAdmin.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginAdmin.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "access token expiration is before refresh token expiration",
    expiredAt < refreshableUntil,
  );

  // Step 9: Verify tokens are different between join and login (new session)
  TestValidator.notEquals(
    "login access token differs from join access token",
    loginAdmin.token.access,
    joinedAdmin.token.access,
  );
  TestValidator.notEquals(
    "login refresh token differs from join refresh token",
    loginAdmin.token.refresh,
    joinedAdmin.token.refresh,
  );
}
