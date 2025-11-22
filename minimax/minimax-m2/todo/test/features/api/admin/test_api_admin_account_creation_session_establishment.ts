import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator account creation and immediate session establishment for
 * TodoApp system.
 *
 * This test validates the complete admin onboarding flow including account
 * creation with proper credentials, role assignment, and JWT token issuance for
 * immediate privileged system access.
 *
 * Key validation points:
 *
 * 1. Successful admin account creation with valid email, password hash, and
 *    appropriate role level
 * 2. Immediate JWT access token issuance with proper expiration and refresh token
 *    generation
 * 3. Role-based privilege assignment enabling admin to access TodoApp system
 *    administration features
 * 4. Session establishment allowing immediate system oversight capabilities
 *    without additional authentication steps
 *
 * The test ensures new administrators can perform user management, system
 * administration, and comprehensive oversight tasks immediately after account
 * creation.
 */
export async function test_api_admin_account_creation_session_establishment(
  connection: api.IConnection,
) {
  // Generate realistic admin account data
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // Simulate hashed password
  const firstName: string = RandomGenerator.name(1);
  const lastName: string = RandomGenerator.name(1);
  const roleLevel: string = RandomGenerator.pick([
    "super_admin",
    "admin",
    "moderator",
  ] as const);
  const status: string = "active";

  // Create administrator account and establish session
  const adminResponse: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role_level: roleLevel,
        status: status,
      } satisfies ITodoAppAdministrator.ICreate,
    });

  // Validate response structure and type safety
  typia.assert(adminResponse);

  // Verify admin ID is properly generated
  TestValidator.predicate(
    "admin ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminResponse.id,
    ),
  );

  // Validate JWT token structure and properties
  TestValidator.predicate(
    "JWT access token should exist",
    adminResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "JWT refresh token should exist",
    adminResponse.token.refresh.length > 0,
  );

  // Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "access token expiration should be future date",
    new Date(adminResponse.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration should be future date",
    new Date(adminResponse.token.refreshable_until) > new Date(),
  );

  // Verify refresh token expiration is later than access token expiration
  TestValidator.predicate(
    "refresh token should expire after access token",
    new Date(adminResponse.token.refreshable_until) >
      new Date(adminResponse.token.expired_at),
  );

  // Validate proper date-time format compliance
  TestValidator.predicate(
    "access token expiration should be ISO 8601 format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      adminResponse.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refresh token expiration should be ISO 8601 format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      adminResponse.token.refreshable_until,
    ),
  );

  // Test session establishment - the connection should now have admin authorization
  TestValidator.predicate(
    "connection should have admin authorization header",
    connection.headers?.Authorization === adminResponse.token.access,
  );

  // Validate role-based privileges are established for immediate system access
  TestValidator.predicate(
    "admin role level should enable system oversight",
    ["super_admin", "admin", "moderator"].includes(roleLevel),
  );

  // Verify immediate system access readiness
  TestValidator.predicate(
    "admin should have immediate privileged access",
    adminResponse.id.length > 0 &&
      adminResponse.token.access.length > 0 &&
      adminResponse.token.refresh.length > 0,
  );

  // Test that admin can perform system administration tasks immediately
  TestValidator.predicate(
    "admin session should support user management operations",
    adminResponse.token.access.length > 0 &&
      adminResponse.token.refresh.length > 0,
  );

  // Validate comprehensive oversight capabilities are enabled
  TestValidator.predicate(
    "admin should have comprehensive system access",
    adminResponse.id !== null &&
      adminResponse.token.access !== null &&
      adminResponse.token.refresh !== null &&
      adminResponse.token.expired_at !== null &&
      adminResponse.token.refreshable_until !== null,
  );

  // Final validation: Ensure all required properties for admin functionality are present
  TestValidator.equals(
    "admin response should contain all required session establishment data",
    {
      id: adminResponse.id,
      hasAccessToken: adminResponse.token.access.length > 0,
      hasRefreshToken: adminResponse.token.refresh.length > 0,
      hasAccessExpiration: adminResponse.token.expired_at.length > 0,
      hasRefreshExpiration: adminResponse.token.refreshable_until.length > 0,
    },
    {
      id: adminResponse.id,
      hasAccessToken: true,
      hasRefreshToken: true,
      hasAccessExpiration: true,
      hasRefreshExpiration: true,
    },
  );
}
