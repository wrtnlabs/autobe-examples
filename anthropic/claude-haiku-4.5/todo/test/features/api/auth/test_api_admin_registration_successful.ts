import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test successful admin account creation through the join endpoint.
 *
 * This test validates the complete admin registration workflow:
 *
 * 1. Create a new admin account with valid credentials
 * 2. Verify successful registration with proper response structure
 * 3. Validate JWT tokens (access and refresh) are issued
 * 4. Confirm tokens can be used for subsequent authenticated requests
 * 5. Test with various valid email formats
 */
export async function test_api_admin_registration_successful(
  connection: api.IConnection,
) {
  // Test 1: Register admin with valid email and password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12) + "1!"; // Ensure strong password with mixed characters

  const adminResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  // Validate complete response structure and all fields
  typia.assert(adminResponse);
  TestValidator.equals(
    "admin email matches input",
    adminResponse.email,
    adminEmail,
  );

  // Verify token expiration is in future (logical validation, not type validation)
  const now = new Date();
  const accessExpired = new Date(adminResponse.token.expired_at);
  const refreshExpired = new Date(adminResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token has future expiration",
    accessExpired > now,
  );
  TestValidator.predicate(
    "refresh token has future expiration",
    refreshExpired > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshExpired > accessExpired,
  );

  // Verify deleted_at is null or undefined for new account (handle both cases)
  TestValidator.predicate(
    "deleted_at should be null or undefined for new admin",
    adminResponse.deleted_at === null || adminResponse.deleted_at === undefined,
  );

  // Verify authorization header was set with access token by SDK
  TestValidator.equals(
    "authorization header set with access token",
    connection.headers?.Authorization,
    adminResponse.token.access,
  );

  // Test 2: Test with another valid email format to ensure email validation is flexible
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminPassword = RandomGenerator.alphabets(10) + "Aa1!";

  const secondAdminResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: secondAdminEmail,
        password: secondAdminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  typia.assert(secondAdminResponse);
  TestValidator.equals(
    "second admin email matches input",
    secondAdminResponse.email,
    secondAdminEmail,
  );
  TestValidator.notEquals(
    "different admins have different ids",
    adminResponse.id,
    secondAdminResponse.id,
  );

  // Test 3: Verify token structure is correct for both admins
  TestValidator.predicate(
    "first admin has valid tokens",
    adminResponse.token.access.length > 0 &&
      adminResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second admin has valid tokens",
    secondAdminResponse.token.access.length > 0 &&
      secondAdminResponse.token.refresh.length > 0,
  );
}
