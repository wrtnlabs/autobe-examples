import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test successful administrator login with valid credentials.
 *
 * This test validates the complete authentication workflow for platform
 * administrators. It creates a new admin account with proper credentials and
 * then uses those same credentials to authenticate, verifying that the login
 * process correctly validates credentials against stored authentication data
 * and issues proper access tokens. The test ensures the response includes
 * complete admin profile information, authentication tokens, and session
 * context while maintaining security boundaries.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const createdAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });

  typia.assert(createdAdmin);

  // Step 2: Use the created credentials to authenticate
  const loginResponse: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://platform.example.com/admin/login",
        referrer: "https://platform.example.com/admin/dashboard",
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } satisfies ICommunityPlatformAdmin.ILogin,
    });

  typia.assert(loginResponse);

  // Step 3: Validate that login response contains complete admin profile
  TestValidator.equals(
    "admin ID should match",
    loginResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "admin email should match",
    loginResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "display name should match",
    loginResponse.display_name,
    createdAdmin.display_name,
  );
  TestValidator.equals(
    "admin level should match",
    loginResponse.admin_level,
    "system",
  );
  TestValidator.equals(
    "super admin status should match",
    loginResponse.is_super_admin,
    true,
  );

  // Step 4: Validate authentication tokens are present
  TestValidator.predicate(
    "access token should be present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be valid",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until should be valid",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );

  // Step 5: Validate temporal context
  TestValidator.predicate(
    "created at timestamp should be valid",
    new Date(loginResponse.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated at timestamp should be valid",
    new Date(loginResponse.updated_at) <= new Date(),
  );
}
