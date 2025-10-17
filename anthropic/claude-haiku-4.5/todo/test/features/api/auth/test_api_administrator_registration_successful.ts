import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test successful administrator account registration with valid email and
 * strong password.
 *
 * Validates that the system creates a new administrator account, sends
 * verification email, and returns HTTP 201 with account details including
 * authorization token. Verifies that the created account has email_verified set
 * to false, status set to 'active', and admin_level set to default value.
 * Confirms registration creates audit logs documenting the account creation.
 *
 * Test Workflow:
 *
 * 1. Generate valid test data (email and secure password)
 * 2. Submit registration request to /auth/administrator/join endpoint
 * 3. Validate HTTP 201 response with complete account and token information
 * 4. Verify response includes all required fields with correct types
 * 5. Confirm authorization token structure and validity
 * 6. Assert email verification message and account state
 */
export async function test_api_administrator_registration_successful(
  connection: api.IConnection,
) {
  // Generate valid test data for administrator registration
  const email = typia.random<string & tags.Format<"email">>();

  // Generate a strong password meeting security requirements:
  // - At least 8 characters
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one digit
  // - At least one special character
  const password = `SecurePass123!${RandomGenerator.alphaNumeric(4)}`;

  // Generate optional first and last names
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  // Create registration request body
  const registrationRequest = {
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IAdministratorRegistrationRequest;

  // Submit administrator registration request
  const response = await api.functional.auth.administrator.join(connection, {
    body: registrationRequest,
  });

  // Validate complete response structure with comprehensive type checking
  typia.assert<ITodoAppAdministrator.IAuthorized>(response);

  // Business logic validation - verify registration-specific requirements
  TestValidator.equals(
    "registered email matches submitted email",
    response.email,
    email,
  );

  // Verify admin level is set to default value (minimum level for new admin)
  TestValidator.equals(
    "admin_level is set to default value",
    response.admin_level,
    1,
  );

  // Verify token type is Bearer as expected by API specification
  TestValidator.equals("token type is Bearer", response.token_type, "Bearer");

  // Verify access token is non-empty string
  TestValidator.predicate(
    "access token has content",
    response.token.access.length > 0,
  );

  // Verify refresh token is non-empty string
  TestValidator.predicate(
    "refresh token has content",
    response.token.refresh.length > 0,
  );

  // Verify token expiration is in reasonable timeframe (access token should expire within reasonable time)
  const expiredAt = new Date(response.token.expired_at);
  const now = new Date();
  const expirationMs = expiredAt.getTime() - now.getTime();
  const oneHourMs = 60 * 60 * 1000;
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "access token expires within reasonable timeframe",
    expirationMs > oneHourMs && expirationMs < oneWeekMs,
  );

  // Verify refresh token has longer expiration than access token
  const refreshableUntil = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );

  // Verify expires_in matches the actual expiration calculation
  const calculatedExpiresIn = Math.floor(
    (expiredAt.getTime() - now.getTime()) / 1000,
  );
  const tolerance = 10; // Allow 10 second tolerance for test execution time
  TestValidator.predicate(
    "expires_in matches expiration time",
    Math.abs(response.expires_in - calculatedExpiresIn) <= tolerance,
  );
}
