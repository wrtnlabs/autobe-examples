import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test session creation and security tracking during administrator login.
 *
 * This test validates the complete administrator authentication workflow
 * including account registration, login authentication, JWT token generation,
 * and session security tracking. The test ensures that:
 *
 * 1. Admin account creation succeeds with valid credentials
 * 2. Admin login authenticates successfully with correct credentials
 * 3. JWT tokens (access and refresh) are properly generated and returned
 * 4. Token expiration timestamps are set correctly
 * 5. Admin profile information is included in the authorization response
 * 6. The authentication token is automatically configured in connection headers
 *
 * The backend system should create session records in reddit_like_sessions with
 * access tokens, refresh tokens, IP addresses, user agents, and activity
 * timestamps for security monitoring and audit trail purposes.
 */
export async function test_api_admin_login_session_creation_and_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for login testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const createdAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Validate admin creation response structure
  TestValidator.predicate(
    "created admin has valid ID",
    createdAdmin.id.length > 0,
  );
  TestValidator.equals(
    "created admin username matches",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "created admin has token",
    createdAdmin.token !== null,
  );

  // Step 2: Login with the created admin credentials
  const loginResponse: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Validate login response contains proper admin profile
  TestValidator.equals(
    "login response ID matches created admin",
    loginResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "login response username matches",
    loginResponse.username,
    adminUsername,
  );
  TestValidator.equals(
    "login response email matches",
    loginResponse.email,
    adminEmail,
  );

  // Step 4: Validate JWT token structure and properties
  const token: IAuthorizationToken = loginResponse.token;
  typia.assert(token);

  TestValidator.predicate("access token is not empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is not empty",
    token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is set",
    token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration is set",
    token.refreshable_until.length > 0,
  );

  // Step 5: Validate token expiration timestamps are in the future
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expires in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expires in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );

  // Step 6: Validate that authentication token is set in connection headers
  TestValidator.predicate(
    "connection headers contain authorization",
    connection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    connection.headers?.Authorization,
    token.access,
  );
}
