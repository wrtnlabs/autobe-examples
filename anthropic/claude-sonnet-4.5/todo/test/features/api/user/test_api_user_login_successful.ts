import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user authentication workflow.
 *
 * This test validates the complete user login process by first creating a new
 * user account and then authenticating with the same credentials. It verifies
 * that the authentication system properly validates credentials, creates
 * sessions, and issues JWT tokens with correct user profile information.
 *
 * Test workflow:
 *
 * 1. Register a new user account with valid email and password
 * 2. Verify registration response contains complete user profile and tokens
 * 3. Perform login with the registered credentials
 * 4. Verify login response contains valid tokens and matching user profile
 * 5. Validate token structure and expiration timestamps
 * 6. Confirm user data consistency between registration and login
 */
export async function test_api_user_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate test user credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Register a new user account
  const registrationBody = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });

  // Step 3: Validate registration response
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered email matches input",
    registeredUser.email,
    email,
  );

  // Step 4: Perform login with the same credentials
  const loginBody = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies ITodoListUser.ILogin;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody,
    });

  // Step 5: Validate login response
  typia.assert(authenticatedUser);
  TestValidator.equals(
    "login user ID matches registered user",
    authenticatedUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "login email matches registered email",
    authenticatedUser.email,
    email,
  );

  // Step 6: Validate token expiration timestamps are in the future
  const accessTokenExpiration = new Date(authenticatedUser.token.expired_at);
  const refreshTokenExpiration = new Date(
    authenticatedUser.token.refreshable_until,
  );
  const currentTime = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    accessTokenExpiration > currentTime,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshTokenExpiration > currentTime,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshTokenExpiration > accessTokenExpiration,
  );

  // Step 7: Verify user profile consistency
  TestValidator.equals(
    "email verification status matches",
    authenticatedUser.email_verified,
    registeredUser.email_verified,
  );
}
