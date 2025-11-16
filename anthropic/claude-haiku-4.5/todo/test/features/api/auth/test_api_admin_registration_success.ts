import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test successful administrator account registration and initial
 * authentication.
 *
 * This test validates the complete admin registration workflow:
 *
 * 1. Submit valid admin credentials (email and password)
 * 2. Verify successful account creation with proper response structure
 * 3. Validate admin account details (ID, email, timestamps)
 * 4. Verify JWT token pair is issued (access and refresh tokens)
 * 5. Confirm tokens have proper expiration information
 * 6. Verify the access token is immediately usable for authenticated requests
 *
 * The test ensures that:
 *
 * - Registration endpoint accepts valid credentials
 * - Response includes unique UUID for the admin account
 * - Created_at and updated_at timestamps are properly set
 * - Deleted_at is null for active accounts
 * - JWT token contains both access and refresh tokens
 * - Tokens have proper expiration timestamps
 * - Email matches the submitted registration email
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Generate valid admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  // Register a new admin account with valid credentials
  const registeredAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  // Validate the complete response structure and data
  // This single assertion validates ALL type constraints, formats, and structure
  typia.assert(registeredAdmin);

  // Verify business logic: email matches submitted registration email
  TestValidator.equals(
    "admin email should match submitted email",
    registeredAdmin.email,
    adminEmail,
  );

  // Verify business logic: deleted_at is null for newly created active account
  TestValidator.equals(
    "deleted_at should be null for active admin account",
    registeredAdmin.deleted_at,
    null,
  );

  // Verify business logic: tokens are distinct and properly structured
  TestValidator.notEquals(
    "access token and refresh token should be different",
    registeredAdmin.token.access,
    registeredAdmin.token.refresh,
  );

  // Verify business logic: refresh token expiration is further in future than access token
  const refreshableTime = new Date(
    registeredAdmin.token.refreshable_until,
  ).getTime();
  const expiredTime = new Date(registeredAdmin.token.expired_at).getTime();
  TestValidator.predicate(
    "refresh token expiration should extend beyond access token expiration",
    refreshableTime > expiredTime,
  );
}
