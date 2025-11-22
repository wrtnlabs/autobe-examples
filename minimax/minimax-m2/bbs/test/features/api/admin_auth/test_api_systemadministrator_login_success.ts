import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test successful system administrator authentication flow.
 *
 * Create a new administrator account first, then test the login process to
 * validate complete authentication workflow including JWT token generation and
 * admin privilege establishment. Verify that the login response contains proper
 * admin user profile information, access tokens, refresh tokens, and session
 * expiration timestamps. Test that authenticated admin can access system
 * administration functions.
 */
export async function test_api_systemadministrator_login_success(
  connection: api.IConnection,
) {
  // Step 1: Generate test admin account data
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminDisplayName: string = RandomGenerator.name();

  // Step 2: Create new administrator account
  const createdAdmin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: adminDisplayName,
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 3: Validate admin account creation response
  TestValidator.equals(
    "admin account ID is UUID format",
    createdAdmin.id.length,
    36,
  );
  TestValidator.equals(
    "admin display name matches",
    createdAdmin.display_name,
    adminDisplayName,
  );
  TestValidator.equals("admin email matches", createdAdmin.email, adminEmail);
  TestValidator.equals("admin status is active", createdAdmin.status, "active");
  TestValidator.equals(
    "admin has authorization token",
    !!createdAdmin.token,
    true,
  );
  TestValidator.equals(
    "admin has access token",
    !!createdAdmin.token.access,
    true,
  );
  TestValidator.equals(
    "admin has refresh token",
    !!createdAdmin.token.refresh,
    true,
  );
  TestValidator.equals(
    "admin has token expiration",
    !!createdAdmin.token.expired_at,
    true,
  );
  TestValidator.equals(
    "admin has refreshable until",
    !!createdAdmin.token.refreshable_until,
    true,
  );

  // Step 4: Test login with created admin credentials (both operations are public endpoints)
  const loginResponse: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.login.signIn(connection, {
      body: {
        email: adminEmail,
        password: "1234", // Default password for system administrators
        href: "https://admin.test.com/login",
        referrer: "https://admin.test.com",
      } satisfies IEconPoliticalDiscussionUser.ILogin,
    });
  typia.assert(loginResponse);

  // Step 5: Validate login response
  TestValidator.equals(
    "login returns same admin ID",
    loginResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "login returns same display name",
    loginResponse.display_name,
    adminDisplayName,
  );
  TestValidator.equals(
    "login returns same email",
    loginResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "login returns active status",
    loginResponse.status,
    "active",
  );
  TestValidator.equals(
    "login has new authorization token",
    !!loginResponse.token,
    true,
  );
  TestValidator.equals(
    "login has new access token",
    !!loginResponse.token.access,
    true,
  );
  TestValidator.equals(
    "login has new refresh token",
    !!loginResponse.token.refresh,
    true,
  );
  TestValidator.equals(
    "login has token expiration timestamp",
    !!loginResponse.token.expired_at,
    true,
  );
  TestValidator.equals(
    "login has refreshable until timestamp",
    !!loginResponse.token.refreshable_until,
    true,
  );

  // Step 6: Validate token structure and format
  TestValidator.predicate(
    "access token is JWT format",
    loginResponse.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token is JWT format",
    loginResponse.token.refresh.split(".").length === 3,
  );

  // Step 7: Validate expiration times are in the future
  const now = new Date();
  const accessExpiry = new Date(loginResponse.token.expired_at);
  const refreshExpiry = new Date(loginResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in future",
    accessExpiry > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in future",
    refreshExpiry > now,
  );
  TestValidator.predicate(
    "refresh expiry is after access expiry",
    refreshExpiry > accessExpiry,
  );

  // Step 8: Validate created timestamps
  TestValidator.equals(
    "created_at is timestamp",
    typeof createdAdmin.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is timestamp",
    typeof createdAdmin.updated_at,
    "string",
  );
  TestValidator.equals(
    "login created_at matches original",
    loginResponse.created_at,
    createdAdmin.created_at,
  );
  TestValidator.equals(
    "login updated_at is updated",
    loginResponse.updated_at,
    createdAdmin.updated_at,
  );

  // Step 9: Validate optional profile fields
  if (createdAdmin.bio !== undefined) {
    TestValidator.equals(
      "bio preserved through login",
      loginResponse.bio,
      createdAdmin.bio,
    );
  }
  if (createdAdmin.avatar_url !== undefined) {
    TestValidator.equals(
      "avatar_url preserved through login",
      loginResponse.avatar_url,
      createdAdmin.avatar_url,
    );
  }

  // Step 10: Verify tokens are different (login generates new tokens)
  TestValidator.notEquals(
    "access tokens are different",
    createdAdmin.token.access,
    loginResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens are different",
    createdAdmin.token.refresh,
    loginResponse.token.refresh,
  );

  // Step 11: Verify token expiration times are different
  TestValidator.notEquals(
    "access token expiration times are different",
    createdAdmin.token.expired_at,
    loginResponse.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh token expiration times are different",
    createdAdmin.token.refreshable_until,
    loginResponse.token.refreshable_until,
  );
}
