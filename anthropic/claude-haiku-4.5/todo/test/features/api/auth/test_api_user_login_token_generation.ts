import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates JWT token generation upon successful user login.
 *
 * Tests that JWT tokens are generated correctly with proper expiration times
 * and structure. This includes verifying access tokens have short expiration
 * (typically 15 minutes) and refresh tokens have longer expiration (typically 7
 * days). Both tokens should be valid JWTs with standard claims including user
 * ID and JTI for revocation tracking.
 *
 * Test workflow:
 *
 * 1. Create a user account via registration endpoint
 * 2. Login with valid credentials
 * 3. Validate response contains access_token and refresh_token
 * 4. Verify tokens are valid JWT strings (three dot-separated parts)
 * 5. Validate access_token expiration is within 15 minutes
 * 6. Validate refresh_token expiration is within 7 days
 * 7. Ensure both tokens include proper claims structure
 */
export async function test_api_user_login_token_generation(
  connection: api.IConnection,
) {
  // Step 1: Create a test user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);

  const registrationResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(registrationResponse);
  const userId = registrationResponse.id;

  // Step 2: Login with the created credentials
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.ILogin,
  });

  typia.assert(loginResponse);

  // Step 3: Validate response contains token object with access and refresh tokens
  TestValidator.predicate(
    "login response contains token object",
    loginResponse.token !== null && loginResponse.token !== undefined,
  );

  const token = loginResponse.token;

  // Step 4: Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Step 5: Validate tokens are valid JWT format (three parts separated by dots)
  const accessTokenParts = token.access.split(".");
  TestValidator.equals(
    "access token has valid JWT structure (3 parts)",
    accessTokenParts.length,
    3,
  );

  const refreshTokenParts = token.refresh.split(".");
  TestValidator.equals(
    "refresh token has valid JWT structure (3 parts)",
    refreshTokenParts.length,
    3,
  );

  // Step 6: Validate expiration timestamps are ISO 8601 format
  TestValidator.predicate(
    "access token expiration is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );

  TestValidator.predicate(
    "refresh token expiration is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );

  // Step 7: Validate access token expiration is approximately 15 minutes from now
  const now = new Date();
  const accessExpiry = new Date(token.expired_at);
  const accessExpiryMinutes =
    (accessExpiry.getTime() - now.getTime()) / (1000 * 60);

  TestValidator.predicate(
    "access token expires within ~15 minutes (10-20 min range)",
    accessExpiryMinutes >= 10 && accessExpiryMinutes <= 20,
  );

  // Step 8: Validate refresh token expiration is approximately 7 days from now
  const refreshExpiry = new Date(token.refreshable_until);
  const refreshExpiryDays =
    (refreshExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "refresh token expires within ~7 days (6-8 day range)",
    refreshExpiryDays >= 6 && refreshExpiryDays <= 8,
  );

  // Step 9: Validate that refresh token expiration is later than access token expiration
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshExpiry.getTime() > accessExpiry.getTime(),
  );

  // Step 10: Validate user ID in response matches created user
  TestValidator.equals(
    "login response user ID matches created user",
    loginResponse.id,
    userId,
  );

  // Step 11: Validate user email in response matches login credentials
  TestValidator.equals(
    "login response email matches login credentials",
    loginResponse.email,
    email,
  );

  // Step 12: Validate that tokens are not identical (security check)
  TestValidator.notEquals(
    "access and refresh tokens are different",
    token.access,
    token.refresh,
  );
}
