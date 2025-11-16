import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates JWT token expiration times for user registration.
 *
 * Tests that the registration endpoint returns properly configured JWT tokens
 * with reasonable expiration timeframes. The access token should expire within
 * a short-to-medium timeframe (15-60 minutes), while the refresh token extends
 * much further into the future (hours or days).
 *
 * Steps:
 *
 * 1. Register a new user with valid credentials
 * 2. Validate that the response includes both access and refresh tokens
 * 3. Verify access token expiration is in ISO 8601 format
 * 4. Verify refresh token expiration is in ISO 8601 format
 * 5. Validate access token expires within 15-60 minutes from now
 * 6. Validate refresh token expires further in future than access token
 * 7. Ensure both expiration times are logical and correctly sequenced
 */
export async function test_api_user_registration_token_expiration_validity(
  connection: api.IConnection,
) {
  // Generate test user credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Register a new user
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoAppUser.ICreate,
    },
  );

  // Validate user response structure
  typia.assert(user);
  typia.assert<ITodoAppUser.IAuthorized>(user);

  // Extract token information
  const token: IAuthorizationToken = user.token;
  typia.assert(token);

  // Get current time for expiration validation
  const now = new Date();
  const nowTime = now.getTime();

  // Parse expiration timestamps
  const accessTokenExpiredAt = new Date(token.expired_at);
  const refreshTokenExpiredAt = new Date(token.refreshable_until);
  const accessTokenExpiredTime = accessTokenExpiredAt.getTime();
  const refreshTokenExpiredTime = refreshTokenExpiredAt.getTime();

  // Validate access token expiration is in the future
  TestValidator.predicate(
    "access token expiration should be in the future",
    accessTokenExpiredTime > nowTime,
  );

  // Validate refresh token expiration is in the future
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshTokenExpiredTime > nowTime,
  );

  // Validate access token expires within 15-60 minutes (900000-3600000 ms)
  const accessTokenExpiryDelta = accessTokenExpiredTime - nowTime;
  const fifteenMinutesMs = 15 * 60 * 1000;
  const sixtyMinutesMs = 60 * 60 * 1000;

  TestValidator.predicate(
    "access token should expire within 15-60 minutes from now",
    accessTokenExpiryDelta >= fifteenMinutesMs &&
      accessTokenExpiryDelta <= sixtyMinutesMs,
  );

  // Validate refresh token expires further in future than access token
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshTokenExpiredTime > accessTokenExpiredTime,
  );

  // Validate the time difference between tokens is reasonable (at least hours)
  const tokenExpiryDifference =
    refreshTokenExpiredTime - accessTokenExpiredTime;
  const oneHourMs = 60 * 60 * 1000;

  TestValidator.predicate(
    "refresh token should expire at least 1 hour after access token",
    tokenExpiryDifference >= oneHourMs,
  );

  // Validate ISO 8601 format for expiration timestamps
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

  TestValidator.predicate(
    "access token expired_at should be in ISO 8601 format",
    iso8601Regex.test(token.expired_at),
  );

  TestValidator.predicate(
    "refresh token refreshable_until should be in ISO 8601 format",
    iso8601Regex.test(token.refreshable_until),
  );
}
