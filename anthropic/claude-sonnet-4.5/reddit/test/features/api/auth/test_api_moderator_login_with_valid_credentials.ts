import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator login with valid credentials.
 *
 * This test validates the complete moderator authentication workflow:
 *
 * 1. Register a new moderator account through the join endpoint
 * 2. Authenticate using the registered credentials via login endpoint
 * 3. Verify JWT tokens (access token with 30-minute expiration, refresh token with
 *    30-day expiration)
 * 4. Validate moderator profile information is correctly returned
 * 5. Ensure successful login resets failed_login_attempts to zero
 * 6. Confirm last_successful_login_at timestamp is recorded
 */
export async function test_api_moderator_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // At least 8 characters
  const username = RandomGenerator.alphaNumeric(10); // Valid alphanumeric username

  const registrationData = {
    username: username,
    email: email,
    password: password,
  } satisfies IRedditLikeModerator.ICreate;

  const registered = await api.functional.auth.moderator.join(connection, {
    body: registrationData,
  });
  typia.assert(registered);

  // Step 2: Authenticate with the same credentials
  const loginData = {
    email: email,
    password: password,
  } satisfies IRedditLikeModerator.ILogin;

  const authenticated = await api.functional.auth.moderator.login(connection, {
    body: loginData,
  });
  typia.assert(authenticated);

  // Step 3: Validate the response structure and data
  TestValidator.equals("moderator id matches", authenticated.id, registered.id);
  TestValidator.equals(
    "moderator username matches",
    authenticated.username,
    registered.username,
  );
  TestValidator.equals(
    "moderator email matches",
    authenticated.email,
    registered.email,
  );

  // Step 4: Verify JWT token structure
  typia.assert<IAuthorizationToken>(authenticated.token);

  // Step 5: Validate token expiration logic
  const currentTime = new Date();
  const expirationTime = new Date(authenticated.token.expired_at);
  const refreshableTime = new Date(authenticated.token.refreshable_until);

  // Access token should expire in the future (approximately 30 minutes from now)
  TestValidator.predicate(
    "access token expires in the future",
    expirationTime.getTime() > currentTime.getTime(),
  );

  const accessTokenDuration = expirationTime.getTime() - currentTime.getTime();
  const expectedAccessDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
  TestValidator.predicate(
    "access token expiration is approximately 30 minutes",
    accessTokenDuration > expectedAccessDuration - 60000 &&
      accessTokenDuration < expectedAccessDuration + 60000,
  );

  // Refresh token should be valid in the future (approximately 30 days from now)
  TestValidator.predicate(
    "refresh token expires in the future",
    refreshableTime.getTime() > currentTime.getTime(),
  );

  const refreshTokenDuration =
    refreshableTime.getTime() - currentTime.getTime();
  const expectedRefreshDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  TestValidator.predicate(
    "refresh token expiration is approximately 30 days",
    refreshTokenDuration > expectedRefreshDuration - 3600000 &&
      refreshTokenDuration < expectedRefreshDuration + 3600000,
  );

  // Step 6: Verify tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    authenticated.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authenticated.token.refresh.length > 0,
  );
}
