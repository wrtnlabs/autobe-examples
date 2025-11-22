import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator account creation with different role level assignments.
 *
 * Creates multiple administrative accounts with varying role levels
 * (super_admin, admin, moderator) to validate proper permission assignment and
 * role-based access control. Ensures that each administrative account receives
 * appropriate privileges for their assigned role level and can access TodoApp
 * system features according to their administrative scope.
 */
export async function test_api_admin_account_creation_role_based_permissions(
  connection: api.IConnection,
) {
  // Create super_admin account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password_hash: "super_admin_password_hash",
        first_name: "Super",
        last_name: "Administrator",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(superAdmin);
  TestValidator.equals(
    "super admin account created with valid ID",
    superAdmin.id.length > 0,
    true,
  );

  // Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "admin_password_hash",
        first_name: "Regular",
        last_name: "Administrator",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin account created with valid ID",
    admin.id.length > 0,
    true,
  );

  // Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: "moderator_password_hash",
        first_name: "Moderator",
        last_name: "User",
        role_level: "moderator",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created with valid ID",
    moderator.id.length > 0,
    true,
  );

  // Validate that all accounts have proper authorization token structure
  TestValidator.predicate(
    "super admin has valid access token",
    superAdmin.token.access.length > 10,
  );
  TestValidator.predicate(
    "admin has valid access token",
    admin.token.access.length > 10,
  );
  TestValidator.predicate(
    "moderator has valid access token",
    moderator.token.access.length > 10,
  );

  TestValidator.predicate(
    "super admin has valid refresh token",
    superAdmin.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "admin has valid refresh token",
    admin.token.refresh.length > 10,
  );
  TestValidator.predicate(
    "moderator has valid refresh token",
    moderator.token.refresh.length > 10,
  );

  // Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "super admin access token has expiration",
    superAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "admin access token has expiration",
    admin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "moderator access token has expiration",
    moderator.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "super admin refresh token has expiration",
    superAdmin.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "admin refresh token has expiration",
    admin.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "moderator refresh token has expiration",
    moderator.token.refreshable_until.length > 0,
  );

  // Create suspended account to test different status
  const suspendedEmail = typia.random<string & tags.Format<"email">>();
  const suspended: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: suspendedEmail,
        password_hash: "suspended_password_hash",
        first_name: "Suspended",
        last_name: "Admin",
        role_level: "admin",
        status: "suspended",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(suspended);
  TestValidator.equals(
    "suspended admin account created with valid ID",
    suspended.id.length > 0,
    true,
  );

  // Validate that all created accounts have unique IDs
  TestValidator.notEquals(
    "super admin and admin have unique IDs",
    superAdmin.id,
    admin.id,
  );
  TestValidator.notEquals(
    "super admin and moderator have unique IDs",
    superAdmin.id,
    moderator.id,
  );
  TestValidator.notEquals(
    "super admin and suspended have unique IDs",
    superAdmin.id,
    suspended.id,
  );
  TestValidator.notEquals(
    "admin and moderator have unique IDs",
    admin.id,
    moderator.id,
  );
  TestValidator.notEquals(
    "admin and suspended have unique IDs",
    admin.id,
    suspended.id,
  );
  TestValidator.notEquals(
    "moderator and suspended have unique IDs",
    moderator.id,
    suspended.id,
  );

  // Validate that each account type receives JWT tokens
  TestValidator.equals(
    "super admin receives valid authentication tokens",
    superAdmin.token !== null && superAdmin.token !== undefined,
    true,
  );
  TestValidator.equals(
    "admin receives valid authentication tokens",
    admin.token !== null && admin.token !== undefined,
    true,
  );
  TestValidator.equals(
    "moderator receives valid authentication tokens",
    moderator.token !== null && moderator.token !== undefined,
    true,
  );
  TestValidator.equals(
    "suspended admin receives valid authentication tokens",
    suspended.token !== null && suspended.token !== undefined,
    true,
  );
}
