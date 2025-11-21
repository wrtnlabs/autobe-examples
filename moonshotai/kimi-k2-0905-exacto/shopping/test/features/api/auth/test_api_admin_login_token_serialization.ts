import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test JWT token generation and serialization for administrative sessions.
 *
 * This test validates the complete JWT token lifecycle for administrator
 * authentication, ensuring proper token structure, expiration controls, and
 * refresh token management for secure administrative session handling in the
 * shopping mall platform.
 *
 * Test Coverage:
 *
 * 1. Admin login credential validation with proper email format and security
 *    metadata
 * 2. JWT access token generation and structure validation
 * 3. Refresh token creation and lifecycle management
 * 4. Token expiration timestamp validation in ISO 8601 format
 * 5. Administrative profile inclusion in response
 * 6. Automatic token authorization header management
 * 7. Token format compliance and security validation
 */
export async function test_api_admin_login_token_serialization(
  connection: api.IConnection,
) {
  // Generate valid admin login credentials with proper format constraints
  const loginCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin123!@#", // Strong password meeting admin security requirements
    href: "https://admin.shopping-mall.com/login",
    referrer: "https://admin.shopping-mall.com/",
  } satisfies IShoppingMallAdmin.ILogin;

  // Execute admin login to obtain JWT tokens
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginCredentials,
    });

  // Validate the complete response structure
  typia.assert(adminAuth);

  // Validate authorization token structure and formatting
  TestValidator.predicate(
    "access token is non-empty string",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof adminAuth.token.refresh === "string" &&
      adminAuth.token.refresh.length > 0,
  );

  // Validate ISO 8601 timestamp formats for expiration
  TestValidator.predicate(
    "access token expiration is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(adminAuth.token.expired_at),
  );

  TestValidator.predicate(
    "refresh token expiration is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(
      adminAuth.token.refreshable_until,
    ),
  );

  // Validate timestamps represent future dates
  const currentTime = new Date().getTime();
  const expiredTime = new Date(adminAuth.token.expired_at).getTime();
  const refreshableTime = new Date(adminAuth.token.refreshable_until).getTime();

  TestValidator.predicate(
    "access token expires in the future",
    expiredTime > currentTime,
  );

  TestValidator.predicate(
    "refresh token expires in the future",
    refreshableTime > currentTime,
  );

  // Validate refresh token has longer expiration than access token
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableTime > expiredTime,
  );

  // Validate admin profile completeness
  TestValidator.predicate(
    "admin has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminAuth.id,
    ),
  );

  TestValidator.predicate(
    "admin email matches login credentials",
    adminAuth.email === loginCredentials.email,
  );

  TestValidator.predicate(
    "admin has required name fields",
    adminAuth.first_name.length > 0 && adminAuth.last_name.length > 0,
  );

  TestValidator.predicate(
    "admin level is valid enum value",
    adminAuth.admin_level === "super_admin" ||
      adminAuth.admin_level === "department_admin" ||
      adminAuth.admin_level === "support_admin" ||
      adminAuth.admin_level === "viewer",
  );

  // Validate token uniqueness (different from input credentials)
  TestValidator.predicate(
    "access and refresh tokens are different",
    adminAuth.token.access !== adminAuth.token.refresh,
  );

  // Validate automatic token authorization header management
  TestValidator.predicate(
    "connection has authorization header set automatically",
    connection.headers !== undefined &&
      connection.headers.Authorization !== undefined &&
      connection.headers.Authorization === adminAuth.token.access,
  );

  // Validate response includes comprehensive admin profile
  TestValidator.predicate(
    "admin profile includes department if provided",
    adminAuth.department === undefined ||
      adminAuth.department === null ||
      typeof adminAuth.department === "string",
  );

  TestValidator.predicate(
    "admin has proper super admin status",
    typeof adminAuth.is_super_admin === "boolean",
  );

  TestValidator.predicate(
    "admin account is active",
    adminAuth.is_active === true,
  );

  // Validate audit trail timestamps
  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(adminAuth.created_at),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 if present",
    adminAuth.updated_at === null ||
      adminAuth.updated_at === undefined ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(adminAuth.updated_at),
  );

  // Test token format security compliance
  TestValidator.predicate(
    "access token appears to be JWT format",
    adminAuth.token.access.split(".").length === 3 &&
      adminAuth.token.access.length > 50,
  );

  TestValidator.predicate(
    "refresh token appears to be JWT format",
    adminAuth.token.refresh.split(".").length === 3 &&
      adminAuth.token.refresh.length > 50,
  );
}
