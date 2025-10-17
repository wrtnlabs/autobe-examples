import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test administrator login with valid credentials.
 *
 * This test validates the complete administrator authentication workflow:
 *
 * 1. Register a new admin account with valid credentials
 * 2. Authenticate using the registered email and password
 * 3. Verify JWT tokens are returned (access and refresh tokens)
 * 4. Verify token expiration timestamps are properly set
 * 5. Verify admin profile information is complete and accurate
 * 6. Ensure authentication headers are automatically set
 */
export async function test_api_admin_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create admin registration data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registrationData = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  // Step 2: Register new admin account
  const registeredAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate registration response
  typia.assert(registeredAdmin);

  TestValidator.equals(
    "registered username matches",
    registeredAdmin.username,
    adminUsername,
  );
  TestValidator.equals(
    "registered email matches",
    registeredAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "email is not verified initially",
    registeredAdmin.email_verified === false,
  );
  TestValidator.predicate(
    "is not super admin by default",
    registeredAdmin.is_super_admin === false,
  );
  TestValidator.predicate(
    "registration returns valid token",
    registeredAdmin.token !== null && registeredAdmin.token !== undefined,
  );

  // Step 4: Validate registration tokens
  typia.assert(registeredAdmin.token);
  TestValidator.predicate(
    "access token exists",
    registeredAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(registeredAdmin.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(registeredAdmin.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 5: Create fresh connection for login (simulate new session)
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Step 6: Prepare login credentials
  const loginCredentials = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ILogin;

  // Step 7: Authenticate with valid credentials
  const authenticatedAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.login(loginConnection, {
      body: loginCredentials,
    });

  // Step 8: Validate login response
  typia.assert(authenticatedAdmin);

  TestValidator.equals(
    "authenticated admin ID matches",
    authenticatedAdmin.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "authenticated username matches",
    authenticatedAdmin.username,
    adminUsername,
  );
  TestValidator.equals(
    "authenticated email matches",
    authenticatedAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "email verification status persists",
    authenticatedAdmin.email_verified,
    registeredAdmin.email_verified,
  );
  TestValidator.equals(
    "super admin status persists",
    authenticatedAdmin.is_super_admin,
    registeredAdmin.is_super_admin,
  );

  // Step 9: Validate login tokens
  typia.assert(authenticatedAdmin.token);

  TestValidator.predicate(
    "login access token exists",
    authenticatedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token exists",
    authenticatedAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login access token is different from registration",
    authenticatedAdmin.token.access !== registeredAdmin.token.access,
  );
  TestValidator.predicate(
    "login refresh token is different from registration",
    authenticatedAdmin.token.refresh !== registeredAdmin.token.refresh,
  );

  // Step 10: Validate token expiration times
  const loginExpiredAt = new Date(authenticatedAdmin.token.expired_at);
  const loginRefreshableUntil = new Date(
    authenticatedAdmin.token.refreshable_until,
  );
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in future",
    loginExpiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration is in future",
    loginRefreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    loginRefreshableUntil.getTime() > loginExpiredAt.getTime(),
  );

  // Step 11: Verify access token expiration is approximately 30 minutes
  const accessTokenLifetimeMs = loginExpiredAt.getTime() - now.getTime();
  const expectedAccessLifetimeMs = 30 * 60 * 1000; // 30 minutes in milliseconds
  const accessTokenVarianceMs = 5 * 60 * 1000; // 5 minutes tolerance
  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    Math.abs(accessTokenLifetimeMs - expectedAccessLifetimeMs) <
      accessTokenVarianceMs,
  );

  // Step 12: Verify refresh token expiration is approximately 30 days
  const refreshTokenLifetimeMs =
    loginRefreshableUntil.getTime() - now.getTime();
  const expectedRefreshLifetimeMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const refreshTokenVarianceMs = 24 * 60 * 60 * 1000; // 1 day tolerance
  TestValidator.predicate(
    "refresh token expires in approximately 30 days",
    Math.abs(refreshTokenLifetimeMs - expectedRefreshLifetimeMs) <
      refreshTokenVarianceMs,
  );

  // Step 13: Verify authorization header is set
  TestValidator.predicate(
    "authorization header is set after login",
    loginConnection.headers?.Authorization === authenticatedAdmin.token.access,
  );
}
