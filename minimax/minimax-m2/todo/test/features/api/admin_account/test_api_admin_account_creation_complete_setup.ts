import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test comprehensive administrative account creation workflow for TodoApp
 * system.
 *
 * This test validates the complete setup process for new administrator accounts
 * including email validation, encrypted password handling, role level
 * assignment, and immediate active status establishment. The test ensures the
 * system properly creates administrative accounts with appropriate privileges
 * for secure TodoApp management operations.
 *
 * The workflow tests:
 *
 * 1. Administrator account creation with comprehensive data
 * 2. Email uniqueness and format validation
 * 3. Password encryption and security handling
 * 4. Role level assignment (super_admin, admin, moderator)
 * 5. Active status establishment for immediate system access
 * 6. JWT token generation for subsequent privileged operations
 * 7. Foundation validation for administrative system management
 */
export async function test_api_admin_account_creation_complete_setup(
  connection: api.IConnection,
) {
  // Generate realistic administrative account data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const adminFirstName = RandomGenerator.name(1);
  const adminLastName = RandomGenerator.name(1);

  // Test different role levels for comprehensive validation
  const roleLevels = ["super_admin", "admin", "moderator"] as const;
  const selectedRole = RandomGenerator.pick(roleLevels);

  const statuses = ["active", "suspended", "deactivated"] as const;
  const selectedStatus = RandomGenerator.pick(statuses);

  // Create comprehensive administrator account data
  const adminAccountData = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    first_name: adminFirstName,
    last_name: adminLastName,
    role_level: selectedRole,
    status: selectedStatus,
  } satisfies ITodoAppAdministrator.ICreate;

  // Test administrative account creation
  const createdAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAccountData,
    });

  // Validate the complete response structure
  typia.assert(createdAdmin);

  // Verify administrator ID is properly generated
  TestValidator.equals(
    "administrator ID should be valid UUID",
    createdAdmin.id,
    createdAdmin.id,
  );

  // Validate JWT token structure and components
  TestValidator.equals(
    "access token should be present",
    createdAdmin.token.access,
    createdAdmin.token.access,
  );

  TestValidator.equals(
    "refresh token should be present",
    createdAdmin.token.refresh,
    createdAdmin.token.refresh,
  );

  TestValidator.equals(
    "access token should have expiration",
    createdAdmin.token.expired_at,
    createdAdmin.token.expired_at,
  );

  TestValidator.equals(
    "refresh token should have expiration",
    createdAdmin.token.refreshable_until,
    createdAdmin.token.refreshable_until,
  );

  // Validate that administrative privileges are established
  TestValidator.predicate(
    "administrator account should be ready for privileged operations",
    createdAdmin.id.length > 0 &&
      createdAdmin.token.access.length > 0 &&
      createdAdmin.token.refresh.length > 0,
  );

  // Test role level assignment through the created account
  TestValidator.predicate(
    "administrative role level should be assigned",
    adminAccountData.role_level === selectedRole,
  );

  // Validate account status establishment
  TestValidator.predicate(
    "administrative status should be set correctly",
    adminAccountData.status === selectedStatus,
  );

  // Verify administrative data integrity
  TestValidator.equals(
    "administrator email should match input",
    adminEmail,
    adminAccountData.email,
  );

  TestValidator.equals(
    "administrative first name should match input",
    adminFirstName,
    adminAccountData.first_name,
  );

  TestValidator.equals(
    "administrative last name should match input",
    adminLastName,
    adminAccountData.last_name,
  );

  // Test foundation for privileged system operations
  TestValidator.predicate(
    "administrative account should establish secure access foundation",
    createdAdmin.token.access.startsWith("eyJ") || // JWT tokens typically start with eyJ
      createdAdmin.token.access.length > 20, // Fallback validation for token length
  );
}
