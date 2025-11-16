import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validate the admin registration endpoint response structure and field
 * integrity.
 *
 * This test verifies that when a new admin account is created through the
 * registration endpoint, the API response contains all required fields with
 * correct types, formats, and structure. The response must include the admin's
 * unique identifier, email address, JWT tokens for authentication, and
 * timestamp information for audit trails.
 *
 * Key validations:
 *
 * 1. Response includes id as valid UUID string
 * 2. Email is present and in valid email format
 * 3. Token object contains both access and refresh JWT tokens
 * 4. Token expiration timestamps are present in ISO 8601 format
 * 5. Created_at and updated_at timestamps are present
 * 6. Optional fields (deleted_at, last_active_at) may be null/undefined
 * 7. Sensitive information (password) is not exposed
 * 8. Response structure is consistent across multiple registrations
 */
export async function test_api_admin_registration_response_structure(
  connection: api.IConnection,
) {
  // Test 1: Basic registration and response structure validation
  const adminEmail1 = typia.random<string & tags.Format<"email">>();
  const response1: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail1,
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(response1);

  // Validate email matches input
  TestValidator.equals(
    "email matches registration email",
    response1.email,
    adminEmail1,
  );

  // Validate token structure exists and contains required fields
  const token1 = response1.token;
  TestValidator.predicate(
    "access token is not empty string",
    token1.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty string",
    token1.refresh.length > 0,
  );

  // Test 2: Verify password is not exposed in response
  TestValidator.predicate(
    "response does not expose password",
    !("password" in response1),
  );

  // Test 3: Second registration to test response consistency
  const adminEmail2 = typia.random<string & tags.Format<"email">>();
  const response2: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail2,
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(response2);

  // Verify IDs are different (unique for each registration)
  TestValidator.notEquals("admin IDs are unique", response1.id, response2.id);

  // Verify emails are different
  TestValidator.notEquals(
    "admin emails are different",
    response1.email,
    response2.email,
  );

  // Verify tokens are different
  TestValidator.notEquals(
    "access tokens are different",
    response1.token.access,
    response2.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens are different",
    response1.token.refresh,
    response2.token.refresh,
  );

  // Test 4: Optional fields validation
  TestValidator.predicate(
    "deleted_at is null or undefined",
    response1.deleted_at === null || response1.deleted_at === undefined,
  );
  TestValidator.predicate(
    "last_active_at is null or undefined",
    response1.last_active_at === null || response1.last_active_at === undefined,
  );

  // Test 5: Verify token expiration logic (access token expiration should be after current time)
  const now = new Date();
  const expiredAtDate = new Date(token1.expired_at);
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAtDate > now,
  );

  const refreshableUntilDate = new Date(token1.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntilDate > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntilDate > expiredAtDate,
  );
}
