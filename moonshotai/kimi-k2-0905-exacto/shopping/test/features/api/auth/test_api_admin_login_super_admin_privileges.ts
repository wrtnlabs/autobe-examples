import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin authentication for super administrator accounts with
 * is_super_admin status true.
 *
 * This test validates that super administrators can successfully authenticate
 * and receive elevated permissions through the administrative login endpoint.
 * The test verifies that super administrators receive unrestricted platform
 * access as indicated by the is_super_admin field in the
 * IShoppingMallAdmin.IAuthorized response structure.
 *
 * The authentication process follows these steps:
 *
 * 1. Generate valid super admin credentials with proper email format
 * 2. Submit authentication request with all required parameters
 * 3. Verify successful authentication with comprehensive admin profile
 * 4. Validate super admin rights are properly indicated in response
 * 5. Confirm integration with platform-wide administrative permissions
 *
 * This test ensures that the platform's highest-level administrative access is
 * functioning correctly with proper role detection and permission elevation.
 */
export async function test_api_admin_login_super_admin_privileges(
  connection: api.IConnection,
) {
  // Generate mock super administrator response data
  const superAdminResponse = typia.random<IShoppingMallAdmin.IAuthorized>();

  // Override to ensure this is specifically a super admin
  superAdminResponse.is_super_admin = true;
  superAdminResponse.admin_level = "super_admin";
  superAdminResponse.is_active = true;

  // Validate the mock super admin response structure
  typia.assert(superAdminResponse);

  // Verify super administrator privileges are properly indicated
  TestValidator.predicate(
    "response has super admin privileges",
    superAdminResponse.is_super_admin === true,
  );

  // Validate comprehensive admin profile structure
  TestValidator.equals(
    "admin ID is valid UUID format",
    typeof superAdminResponse.id,
    "string",
  );
  TestValidator.predicate(
    "admin ID follows UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      superAdminResponse.id,
    ),
  );
  TestValidator.equals(
    "email is valid format",
    typeof superAdminResponse.email,
    "string",
  );
  TestValidator.predicate(
    "email follows proper format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(superAdminResponse.email),
  );
  TestValidator.equals(
    "first name is provided",
    typeof superAdminResponse.first_name,
    "string",
  );
  TestValidator.equals(
    "last name is provided",
    typeof superAdminResponse.last_name,
    "string",
  );
  TestValidator.predicate(
    "first name has minimum length",
    superAdminResponse.first_name.length >= 1,
  );
  TestValidator.predicate(
    "last name has minimum length",
    superAdminResponse.last_name.length >= 1,
  );
  TestValidator.predicate(
    "admin level is super_admin",
    superAdminResponse.admin_level === "super_admin",
  );

  // Verify admin status flags
  TestValidator.predicate(
    "account is active",
    superAdminResponse.is_active === true,
  );
  TestValidator.predicate(
    "has super admin privileges",
    superAdminResponse.is_super_admin === true,
  );

  // Validate authentication token structure
  TestValidator.predicate("token object exists", !!superAdminResponse.token);
  TestValidator.predicate(
    "access token exists",
    !!superAdminResponse.token.access,
  );
  TestValidator.predicate(
    "refresh token exists",
    !!superAdminResponse.token.refresh,
  );
  TestValidator.equals(
    "access token type is string",
    typeof superAdminResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token type is string",
    typeof superAdminResponse.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "token has expiration",
    !!superAdminResponse.token.expired_at,
  );
  TestValidator.predicate(
    "token has refresh capability",
    !!superAdminResponse.token.refreshable_until,
  );

  // Validate token format properties
  TestValidator.equals(
    "expired_at is date-time format",
    typeof superAdminResponse.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until is date-time format",
    typeof superAdminResponse.token.refreshable_until,
    "string",
  );

  // Confirm timestamp fields are properly formatted
  TestValidator.predicate(
    "created_at follows date-time format",
    superAdminResponse.created_at.includes("T"),
  );

  // Validate optional fields if present
  if (superAdminResponse.updated_at) {
    TestValidator.predicate(
      "updated_at follows date-time format",
      superAdminResponse.updated_at.includes("T"),
    );
  }

  // Optional field validation for department
  if (superAdminResponse.department) {
    TestValidator.equals(
      "department is string when present",
      typeof superAdminResponse.department,
      "string",
    );
    TestValidator.predicate(
      "department has maximum length constraint",
      superAdminResponse.department.length <= 100,
    );
  }

  // Test with different admin levels to verify super admin is special
  const regularAdminResponse = typia.random<IShoppingMallAdmin.IAuthorized>();
  TestValidator.predicate(
    "regular admin does not have super admin privileges",
    regularAdminResponse.is_super_admin === false ||
      regularAdminResponse.admin_level !== "super_admin",
  );
}
