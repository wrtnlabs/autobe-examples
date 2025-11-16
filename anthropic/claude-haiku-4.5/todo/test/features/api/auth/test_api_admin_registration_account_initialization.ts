import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that newly registered admin account has all required fields properly
 * initialized.
 *
 * Validates admin account registration by creating a new admin with valid
 * credentials and verifying that the response includes:
 *
 * - Correct UUID identifier
 * - Valid email address
 * - Proper created_at and updated_at timestamps
 * - Null deleted_at (active account)
 * - Null or properly initialized last_active_at
 * - Complete JWT token object with access and refresh tokens
 * - Token expiration timestamps in ISO 8601 format
 *
 * This ensures all account initialization fields meet specification
 * requirements.
 */
export async function test_api_admin_registration_account_initialization(
  connection: api.IConnection,
) {
  // Generate valid test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);

  // Create new admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: email,
      password: password,
    } satisfies ITodoAppAdmin.ICreate,
  });

  // Validate response structure and all field types/formats
  // typia.assert performs complete validation including UUID, email, and ISO 8601 formats
  typia.assert(admin);

  // Verify email matches input credentials
  TestValidator.equals(
    "registered email matches input email",
    admin.email,
    email,
  );

  // Verify deleted_at is null for newly created active account
  TestValidator.equals(
    "deleted_at is null for active account",
    admin.deleted_at,
    null,
  );

  // Verify last_active_at is properly initialized (can be null or timestamp)
  TestValidator.predicate(
    "last_active_at is null or valid ISO 8601 timestamp",
    admin.last_active_at === null ||
      admin.last_active_at === undefined ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        admin.last_active_at,
      ),
  );

  // Verify access token is non-empty string
  TestValidator.predicate(
    "access token is non-empty string",
    admin.token.access.length > 0,
  );

  // Verify refresh token is non-empty string
  TestValidator.predicate(
    "refresh token is non-empty string",
    admin.token.refresh.length > 0,
  );

  // Verify expiration logic: access token should expire before refresh token
  const accessExpire = new Date(admin.token.expired_at).getTime();
  const refreshExpire = new Date(admin.token.refreshable_until).getTime();
  TestValidator.predicate(
    "access token expires before refresh token",
    accessExpire < refreshExpire,
  );
}
