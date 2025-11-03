import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user login workflow with session creation and JWT token
 * generation.
 *
 * This test validates the complete authentication flow:
 *
 * 1. Creates a new user account with email and password
 * 2. Authenticates the user with their credentials
 * 3. Verifies session creation with connection metadata
 * 4. Confirms JWT tokens are generated with correct expiration times
 * 5. Validates the response contains all required user information
 *
 * Process:
 *
 * 1. Register a new user account via /auth/user/join endpoint
 * 2. Login with registered credentials via /auth/user/login endpoint with
 *    connection metadata
 * 3. Validate response contains user ID, email, status, and timestamps
 * 4. Verify access token and refresh token are present with valid expiration times
 * 5. Ensure tokens are properly formatted JWT tokens
 */
export async function test_api_user_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = RandomGenerator.alphabets(10); // At least 8 characters

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: registrationEmail,
      password: registrationPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(registeredUser);

  // Validate registration response contains required fields
  TestValidator.equals(
    "registered user email matches input",
    registeredUser.email,
    registrationEmail,
  );
  TestValidator.equals(
    "registered user status is active",
    registeredUser.status,
    "active",
  );
  TestValidator.predicate(
    "registered user has valid ID",
    typeof registeredUser.id === "string" && registeredUser.id.length > 0,
  );

  // Step 2: Authenticate with login credentials
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: registrationEmail,
      password: registrationPassword,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Step 3: Validate login response user information
  TestValidator.equals(
    "authenticated user email matches login email",
    authenticatedUser.email,
    registrationEmail,
  );
  TestValidator.equals(
    "authenticated user ID matches registered user",
    authenticatedUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "authenticated user status is active",
    authenticatedUser.status,
    "active",
  );
  TestValidator.predicate(
    "authenticated user has created_at timestamp",
    typeof authenticatedUser.created_at === "string" &&
      authenticatedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "authenticated user has updated_at timestamp",
    typeof authenticatedUser.updated_at === "string" &&
      authenticatedUser.updated_at.length > 0,
  );

  // Step 4: Validate JWT tokens are present and properly formatted
  const token = authenticatedUser.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is present and non-empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has JWT format (three parts separated by dots)",
    (token.access.match(/\./g) || []).length === 2,
  );
  TestValidator.predicate(
    "refresh token has JWT format (three parts separated by dots)",
    (token.refresh.match(/\./g) || []).length === 2,
  );

  // Step 5: Validate token expiration times
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    new Date(token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    new Date(token.refreshable_until) > new Date(token.expired_at),
  );

  // Step 6: Verify token expiration times align with expectations
  const nowTime = new Date();
  const accessTokenExpTime = new Date(token.expired_at);
  const accessTokenExpMinutes =
    (accessTokenExpTime.getTime() - nowTime.getTime()) / (1000 * 60);

  TestValidator.predicate(
    "access token expires in approximately 30 minutes (within reasonable margin)",
    accessTokenExpMinutes > 25 && accessTokenExpMinutes < 35,
  );

  const refreshTokenExpTime = new Date(token.refreshable_until);
  const refreshTokenExpDays =
    (refreshTokenExpTime.getTime() - nowTime.getTime()) / (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "refresh token expires in approximately 7 days (within reasonable margin)",
    refreshTokenExpDays > 6.5 && refreshTokenExpDays < 7.5,
  );
}
