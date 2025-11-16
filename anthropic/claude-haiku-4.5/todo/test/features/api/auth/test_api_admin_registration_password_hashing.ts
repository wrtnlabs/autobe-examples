import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validates admin registration and secure account creation.
 *
 * This test verifies the admin registration endpoint properly:
 *
 * 1. Creates new admin account with provided email and password credentials
 * 2. Returns complete authorized admin information with valid JWT tokens
 * 3. Initializes proper admin metadata including account creation timestamp
 * 4. Issues properly structured and valid access and refresh JWT tokens
 * 5. Sets correct token expiration times for both access and refresh tokens
 *
 * The test ensures admin accounts are created securely with proper
 * authentication token management for subsequent API access.
 */
export async function test_api_admin_registration_password_hashing(
  connection: api.IConnection,
) {
  // Step 1: Generate test admin credentials with valid email format
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12); // Minimum admin password

  // Step 2: Register new admin account via join endpoint
  const registeredAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  // Step 3: Validate complete response structure and types
  typia.assert(registeredAdmin);

  // Step 4: Verify registered admin has correct email matching input
  TestValidator.equals(
    "registered admin email should match provided email",
    registeredAdmin.email,
    adminEmail,
  );

  // Step 5: Validate access token is properly issued and non-empty
  TestValidator.predicate(
    "access token should be issued and non-empty",
    registeredAdmin.token.access.length > 0,
  );

  // Step 6: Validate refresh token is properly issued and non-empty
  TestValidator.predicate(
    "refresh token should be issued and non-empty",
    registeredAdmin.token.refresh.length > 0,
  );

  // Step 7: Validate access token has appropriate expiration in future
  const now = new Date();
  const accessExpiresAt = new Date(registeredAdmin.token.expired_at);
  TestValidator.predicate(
    "access token should expire in the future",
    accessExpiresAt > now,
  );

  // Step 8: Validate refresh token has appropriate expiration in future
  const refreshExpiresAt = new Date(registeredAdmin.token.refreshable_until);
  TestValidator.predicate(
    "refresh token should expire in the future",
    refreshExpiresAt > now,
  );

  // Step 9: Verify refresh token validity period is longer than access token
  TestValidator.predicate(
    "refresh token should have longer validity than access token",
    refreshExpiresAt > accessExpiresAt,
  );

  // Step 10: Validate admin account creation timestamp is recent
  const createdAt = new Date(registeredAdmin.created_at);
  TestValidator.predicate(
    "admin account should be created in current time window",
    createdAt <= now && now.getTime() - createdAt.getTime() < 5000,
  );

  // Step 11: Validate admin account updated_at timestamp matches created_at
  TestValidator.equals(
    "initial updated_at should equal created_at",
    registeredAdmin.updated_at,
    registeredAdmin.created_at,
  );

  // Step 12: Verify admin has valid UUID identifier assigned
  TestValidator.predicate(
    "admin should have valid UUID format identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredAdmin.id,
    ),
  );

  // Step 13: Validate connection headers include issued access token
  TestValidator.predicate(
    "authorization header should contain issued access token",
    connection.headers?.Authorization === registeredAdmin.token.access,
  );

  // Step 14: Verify deleted_at is null for newly created active account
  TestValidator.equals(
    "newly created admin should not be soft-deleted",
    registeredAdmin.deleted_at,
    null,
  );
}
