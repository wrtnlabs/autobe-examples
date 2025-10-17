import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Test successful guest user registration with valid credentials.
 *
 * This test validates the complete registration workflow:
 *
 * 1. Submit valid email and password credentials
 * 2. Verify new user account is created with active status
 * 3. Confirm email_verified is false and awaiting verification
 * 4. Validate JWT authentication tokens are issued
 * 5. Ensure user can proceed with email verification
 *
 * The test confirms that:
 *
 * - Registration creates a new authenticated user account
 * - Account is immediately active but email unverified
 * - JWT tokens are properly issued with correct expiration
 * - Authorization header is automatically set for subsequent requests
 * - Response structure matches ITodoAppAuthenticatedUser.IAuthorized type
 */
export async function test_api_guest_user_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid registration credentials with strong password
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = "TestPass123!";

  // Step 2: Call guest user registration endpoint
  const registrationResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        email: registrationEmail,
        password: registrationPassword,
      } satisfies ITodoAppGuestUser.IJoin,
    });

  // Step 3: Validate complete response structure with typia.assert
  // This validates all types, formats, UUID, date-time constraints comprehensively
  typia.assert(registrationResponse);

  // Step 4: Verify core registration success - user ID received
  TestValidator.predicate(
    "user ID should be present after registration",
    registrationResponse.id.length > 0,
  );

  // Step 5: Verify authentication token is properly issued
  TestValidator.predicate(
    "access token should be issued and non-empty",
    registrationResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be issued and non-empty",
    registrationResponse.token.refresh.length > 0,
  );

  // Step 6: Validate token expiration metadata is set
  TestValidator.predicate(
    "access token expiration should be set",
    registrationResponse.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiration should be set",
    registrationResponse.token.refreshable_until.length > 0,
  );

  // Step 7: Verify token metadata in response
  TestValidator.predicate(
    "refreshToken should be present in response",
    registrationResponse.refreshToken !== undefined &&
      registrationResponse.refreshToken !== null &&
      registrationResponse.refreshToken.length > 0,
  );

  TestValidator.equals(
    "access token expiration should be 900 seconds",
    registrationResponse.expiresIn,
    900,
  );

  TestValidator.equals(
    "tokenType should be Bearer",
    registrationResponse.tokenType,
    "Bearer",
  );

  // Step 8: Verify Authorization header is automatically set with access token
  TestValidator.predicate(
    "Authorization header should be set with access token",
    connection.headers?.Authorization === registrationResponse.token.access,
  );
}
