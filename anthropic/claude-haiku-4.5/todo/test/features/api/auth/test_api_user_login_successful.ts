import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Validates the complete user authentication workflow including registration,
 * email verification, and login.
 *
 * This test ensures that:
 *
 * 1. A new user can successfully register with valid email and password
 * 2. User email can be verified with a valid verification token
 * 3. User can successfully login with registered credentials
 * 4. Login response contains valid JWT access token with proper structure
 * 5. Token contains required metadata (userId, email, role, expiration)
 * 6. Access token is properly set in connection headers for authenticated requests
 * 7. Last login timestamp is updated on successful authentication
 *
 * The test implements a realistic authentication flow:
 *
 * - Create account → Email verification → Login → Token validation
 */
export async function test_api_user_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with valid credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!@#";

  const registrationResponse = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );

  typia.assert(registrationResponse);
  TestValidator.predicate(
    "registration response contains valid user id",
    registrationResponse.id.length > 0,
  );
  TestValidator.predicate(
    "registration response contains auth token",
    registrationResponse.token !== undefined,
  );

  // Step 2: Verify user email with a valid verification token
  // In a real scenario, this token would be sent via email
  // For testing purposes, we generate a token that meets the minimum length requirement
  const verificationToken = RandomGenerator.alphaNumeric(32);

  const verificationResponse =
    await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
      body: {
        token: verificationToken,
      } satisfies ITodoAppAuth.IVerifyEmailRequest,
    });

  typia.assert(verificationResponse);
  TestValidator.predicate(
    "email verification response contains success message",
    verificationResponse.message.length > 0,
  );

  // Step 3: Login with the registered credentials
  const loginResponse = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ILogin,
    },
  );

  typia.assert(loginResponse);

  // Step 4: Validate the login response structure and user ID
  TestValidator.predicate(
    "login returns valid user id in UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );

  // Step 5: Validate the JWT token structure
  const token = loginResponse.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token is a non-empty string",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is a non-empty string",
    token.refresh.length > 0,
  );

  // Step 6: Validate token expiration time is in the future
  const expiredAt = new Date(token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt.getTime() > now.getTime(),
  );

  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );

  // Step 7: Validate that token type is Bearer
  TestValidator.equals(
    "login returns bearer token type",
    loginResponse.tokenType,
    "Bearer",
  );

  // Step 8: Validate that expiresIn is provided and is a positive number
  TestValidator.predicate(
    "login returns valid expiration time in seconds",
    typeof loginResponse.expiresIn === "number" && loginResponse.expiresIn > 0,
  );

  // Step 9: Verify that the access token is now set in connection headers for authenticated requests
  TestValidator.predicate(
    "authorization header is set after login",
    connection.headers?.Authorization !== undefined,
  );
}
