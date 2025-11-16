import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user authentication with valid email and password
 * credentials. Validates that existing users can properly authenticate, receive
 * valid JWT access and refresh tokens with appropriate expiration times, and
 * that login attempts are properly tracked in user sessions. Verify that
 * successful authentication returns complete user profile information along
 * with token details.
 *
 * This test follows the complete authentication flow:
 *
 * 1. Create a new user account with valid registration data
 * 2. Use those credentials to authenticate via login API
 * 3. Validate the response contains proper authentication details
 * 4. Verify token structure and expiration times
 * 5. Confirm user profile information is returned correctly
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Create a user account to have valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";

  const userCredentials = {
    email,
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/join",
  } satisfies ITodoAppUser.IJoin;

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: userCredentials,
  });

  // Validate user registration was successful
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    email,
  );
  TestValidator.predicate("registered user has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(registeredUser.id),
  );
  TestValidator.predicate("registered user has creation timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(registeredUser.created_at),
  );

  // Step 2: Test login with the created credentials
  const loginCredentials = {
    email,
    password,
    href: "https://example.com/dashboard",
    referrer: "https://example.com/login",
  } satisfies ITodoAppUser.ILogin;

  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: loginCredentials,
  });

  // Step 3: Validate authentication response
  typia.assert(authenticatedUser);

  // Verify the authenticated user data matches the registered user
  TestValidator.equals(
    "authenticated user ID matches",
    authenticatedUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "authenticated user email matches",
    authenticatedUser.email,
    email,
  );
  TestValidator.equals(
    "authenticated user timestamps match",
    authenticatedUser.created_at,
    registeredUser.created_at,
  );
  TestValidator.equals(
    "authenticated user updated_at matches",
    authenticatedUser.updated_at,
    registeredUser.updated_at,
  );

  // Validate token structure and types
  typia.assert<IAuthorizationToken>(authenticatedUser.token);
  TestValidator.predicate(
    "access token exists",
    () => authenticatedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => authenticatedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has valid expiration format",
    () =>
      typia.is<string & tags.Format<"date-time">>(
        authenticatedUser.token.expired_at,
      ) &&
      typia.is<string & tags.Format<"date-time">>(
        authenticatedUser.token.refreshable_until,
      ),
  );

  // Step 4: Verify token expiration times follow documented requirements
  const now = new Date();
  const accessExpiresAt = new Date(authenticatedUser.token.expired_at);
  const refreshExpiresAt = new Date(authenticatedUser.token.refreshable_until);

  // Verify access token expires within reasonable time (30 minutes as documented)
  const accessTokenLifetime =
    (accessExpiresAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires within 30-60 minutes",
    () => accessTokenLifetime >= 29.9 && accessTokenLifetime <= 61,
  );

  // Verify refresh token expires within reasonable time (7 days as documented)
  const refreshTokenLifetime =
    (refreshExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token expires within 7-10 days",
    () => refreshTokenLifetime >= 6.9 && refreshTokenLifetime <= 10.5,
  );

  // Step 5: Validate Authorization header is set after successful login
  // The SDK automatically handles this, but we verify the connection was updated
  TestValidator.predicate(
    "authorization header should contain access token",
    () => connection.headers?.Authorization === authenticatedUser.token.access,
  );

  // Verify user profile information is included
  if (authenticatedUser.user) {
    TestValidator.equals(
      "user profile ID matches",
      authenticatedUser.user.id,
      registeredUser.id,
    );
    TestValidator.equals(
      "user profile email matches",
      authenticatedUser.user.email,
      registeredUser.email,
    );
    TestValidator.equals(
      "user profile creation timestamp matches",
      authenticatedUser.user.created_at,
      registeredUser.created_at,
    );
    TestValidator.equals(
      "user profile updated timestamp matches",
      authenticatedUser.user.updated_at,
      registeredUser.updated_at,
    );
  }

  // Additional validation: Ensure login with same credentials succeeds multiple times
  const secondLogin = await api.functional.auth.user.login(connection, {
    body: loginCredentials,
  });

  typia.assert(secondLogin);
  TestValidator.equals(
    "second login returns same user ID",
    secondLogin.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "second login returns same email",
    secondLogin.email,
    authenticatedUser.email,
  );

  // Verify tokens are different between login attempts (security best practice)
  TestValidator.notEquals(
    "access tokens should be unique per login",
    secondLogin.token.access,
    authenticatedUser.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens should be unique per login",
    secondLogin.token.refresh,
    authenticatedUser.token.refresh,
  );

  // Reset authorization header for clean connection state
  delete connection.headers?.Authorization;
}
