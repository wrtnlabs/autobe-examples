import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin authentication for department-level administrators.
 *
 * Verify that administrators with department assignments receive appropriate
 * scoped permissions within their organizational units. Confirm that the
 * department field in IShoppingMallAdmin.IAuthorized properly reflects
 * assignment while maintaining role-based access control boundaries.
 *
 * 1. Create department admin login credentials with realistic scenarios
 * 2. Authenticate as department-level administrator
 * 3. Validate complete admin profile including department assignment
 * 4. Test both assigned and unassigned department scenarios
 * 5. Verify proper token structure and authorization setup
 * 6. Validate department field correctly reflects organizational structure
 * 7. Confirm role-based access control boundaries
 */
export async function test_api_admin_login_department_administration(
  connection: api.IConnection,
) {
  // Generate department administrator credentials
  const departmentAdminEmail = typia.random<string & tags.Format<"email">>();

  const loginData = {
    email: departmentAdminEmail,
    password: "admin1234",
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.shopping-mall.com/login",
    referrer: "https://admin.shopping-mall.com/",
  } satisfies IShoppingMallAdmin.ILogin;

  // Authenticate as department administrator
  const authResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginData,
    });

  // Validate complete admin profile structure
  typia.assert(authResponse);

  // Verify basic admin identity
  TestValidator.predicate(
    "admin ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authResponse.id,
    ),
  );

  TestValidator.predicate(
    "admin email matches login input",
    authResponse.email === departmentAdminEmail,
  );

  TestValidator.predicate(
    "admin first name has valid length",
    authResponse.first_name.length >= 1 &&
      authResponse.first_name.length <= 100,
  );

  TestValidator.predicate(
    "admin last name has valid length",
    authResponse.last_name.length >= 1 && authResponse.last_name.length <= 100,
  );

  // Validate department assignment scenarios
  if (
    authResponse.department !== null &&
    authResponse.department !== undefined
  ) {
    TestValidator.predicate(
      "department name has valid length when present",
      authResponse.department.length > 0 &&
        authResponse.department.length <= 100,
    );

    TestValidator.predicate(
      "admin account is active for department administration",
      authResponse.is_active === true,
    );

    TestValidator.predicate(
      "department admin has valid creation timestamp",
      authResponse.created_at.length > 0,
    );
  }

  // Validate authorization token structure for department access
  TestValidator.predicate(
    "department admin has access token",
    authResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "department admin has refresh token",
    authResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "department admin token has expiration date",
    authResponse.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "department admin token has refresh deadline",
    authResponse.token.refreshable_until.length > 0,
  );

  // Test super admin scenario (no department assignment)
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminLogin = {
    email: superAdminEmail,
    password: "superadmin1234",
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.shopping-mall.com/super-login",
    referrer: "https://admin.shopping-mall.com/super-admin",
  } satisfies IShoppingMallAdmin.ILogin;

  const superAuthResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: superAdminLogin,
    });

  typia.assert(superAuthResponse);

  // Validate super admin has appropriate permissions
  TestValidator.predicate(
    "super admin has platform-wide access",
    superAuthResponse.is_super_admin === true,
  );

  TestValidator.predicate(
    "super admin is department-independent",
    superAuthResponse.department === null ||
      superAuthResponse.department === undefined,
  );

  TestValidator.predicate(
    "super admin has elevated access level",
    superAuthResponse.admin_level !== "viewer",
  );
}
