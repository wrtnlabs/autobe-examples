import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test successful administrator registration workflow with valid credentials.
 *
 * This test validates the complete administrator registration process including
 * authentication token generation, role assignment, and personal information
 * storage. It ensures that new admin accounts are created with proper security
 * measures and that the response includes all necessary authentication tokens
 * and profile information.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Generate realistic test data for admin registration using proper random generation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // Strong random password
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const adminRole = RandomGenerator.pick([
    "super_admin",
    "support_admin",
    "security_admin",
  ] as const);

  // Generate realistic permissions based on role
  const permissionsData = {
    can_manage_users: true,
    can_view_reports: true,
    can_configure_system: adminRole === "super_admin",
    can_moderate_content:
      adminRole === "support_admin" || adminRole === "super_admin",
    can_audit_security:
      adminRole === "security_admin" || adminRole === "super_admin",
  };
  const permissions = JSON.stringify(permissionsData);

  // Create admin registration request body
  const registrationData = {
    email: adminEmail,
    password: adminPassword,
    first_name: firstName,
    last_name: lastName,
    role: adminRole,
    permissions: permissions,
    status: "pending_activation",
  } satisfies IShoppingMallAdministrator.ICreate;

  // Execute admin registration API call
  const registrationResult = await api.functional.auth.admin.join(connection, {
    body: registrationData,
  });

  // Validate the response structure - typia.assert performs complete validation
  typia.assert(registrationResult);

  // Verify authentication tokens are present and properly structured
  TestValidator.predicate(
    "access token should be generated and non-empty",
    registrationResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be generated and non-empty",
    registrationResult.token.refresh.length > 0,
  );

  // Validate token expiration times are in the future (business logic validation)
  const currentTime = new Date();
  const accessTokenExpiry = new Date(registrationResult.token.expired_at);
  const refreshTokenExpiry = new Date(
    registrationResult.token.refreshable_until,
  );

  TestValidator.predicate(
    "access token expiration should be in the future",
    accessTokenExpiry > currentTime,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshTokenExpiry > currentTime,
  );

  // Verify administrator profile information matches input data
  TestValidator.equals(
    "admin email should match input email",
    registrationResult.administrator.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin role should match input role",
    registrationResult.administrator.role,
    adminRole,
  );

  // Verify the administrator name is properly formatted (combines first and last name)
  TestValidator.predicate(
    "admin name should be properly formatted and non-empty",
    (registrationResult.administrator.name.length > 0 &&
      registrationResult.administrator.name.includes(firstName)) ||
      registrationResult.administrator.name.includes(lastName),
  );

  // Validate that refresh token expires after access token (business logic)
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshTokenExpiry > accessTokenExpiry,
  );

  // Verify the registration was successful by checking the response structure
  TestValidator.predicate(
    "registration should return valid administrator ID",
    registrationResult.administrator.id.length > 0,
  );

  // Validate that the response contains all required properties
  TestValidator.predicate(
    "response should contain complete authentication data",
    registrationResult.token !== undefined &&
      registrationResult.administrator !== undefined &&
      registrationResult.id !== undefined,
  );
}
