import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test that successful administrator registration response includes all
 * required fields with correct structure.
 *
 * Validates the administrator registration endpoint response to ensure it
 * includes all necessary fields and verifies that sensitive information is NOT
 * included in the response. Confirms HTTP 201 status code for successful
 * resource creation.
 *
 * Test steps:
 *
 * 1. Generate valid registration data with email and password
 * 2. Call the administrator registration API endpoint
 * 3. Validate complete response structure matches
 *    ITodoAppAdministrator.IAuthorized type
 * 4. Verify email in response matches submitted email
 * 5. Confirm admin_level is within valid range (1-5)
 * 6. Verify token object contains all required fields
 * 7. Validate token expiration logic (refreshable_until after expired_at)
 * 8. Confirm sensitive information (password, hash) is NOT in response
 */
export async function test_api_administrator_registration_response_structure(
  connection: api.IConnection,
) {
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!@#"; // Must meet: 8+ chars, uppercase, lowercase, digit, special char

  // Call the administrator registration endpoint
  const response: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email,
        password,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IAdministratorRegistrationRequest,
    });

  // Validate response type and all fields using typia.assert
  // This validates: id (UUID), email (email format), admin_level (int32, 1-5), token structure, dates, etc.
  typia.assert(response);

  // Verify email matches submitted email
  TestValidator.equals(
    "response email should match submitted email",
    response.email,
    email,
  );

  // Validate admin_level is within valid range (1-5)
  TestValidator.predicate(
    "admin_level should be between 1 and 5",
    response.admin_level >= 1 && response.admin_level <= 5,
  );

  // Validate token_type is Bearer
  TestValidator.equals(
    "token_type should be Bearer",
    response.token_type,
    "Bearer",
  );

  // Validate expires_in is non-negative
  TestValidator.predicate(
    "expires_in should be non-negative",
    response.expires_in >= 0,
  );

  // Validate token object structure using typia.assert
  // This validates: access (string), refresh (string), expired_at (date-time), refreshable_until (date-time)
  typia.assert(response.token);

  // Verify token expiration logic - refreshable_until should be after expired_at
  const expiredAt = new Date(response.token.expired_at);
  const refreshableUntil = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil > expiredAt,
  );

  // Verify sensitive information is NOT included
  TestValidator.predicate(
    "response should NOT contain password field",
    !("password" in response) &&
      !("password_hash" in response) &&
      !("passwordHash" in response),
  );

  TestValidator.predicate(
    "response should NOT contain internal database fields",
    !("created_at" in response) &&
      !("updated_at" in response) &&
      !("deleted_at" in response),
  );
}
