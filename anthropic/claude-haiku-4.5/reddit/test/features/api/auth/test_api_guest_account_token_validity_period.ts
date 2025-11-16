import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates guest account token validity periods.
 *
 * This test verifies that guest account tokens are issued with appropriate
 * validity periods. It checks that:
 *
 * 1. Access tokens have a short lifespan (approximately 1 hour)
 * 2. Refresh tokens have a longer lifespan (approximately 7 days)
 * 3. Both timestamps are in valid ISO 8601 format (UTC timezone)
 * 4. The refresh token expiration is always later than access token expiration
 * 5. Timestamps are correctly calculated from server time
 *
 * Steps:
 *
 * 1. Create a guest account by calling the join endpoint
 * 2. Extract the token information and expiration timestamps
 * 3. Validate both timestamps are ISO 8601 format strings
 * 4. Verify refreshable_until > expired_at
 * 5. Check access token expires in approximately 1 hour (±5 minutes tolerance)
 * 6. Check refresh token expires in approximately 7 days (±1 hour tolerance)
 * 7. Ensure timestamps represent future times from server perspective
 */
export async function test_api_guest_account_token_validity_period(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account
  const guestAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guestAccount);

  // Step 2: Extract token information
  const token = guestAccount.token;
  const expiredAt = token.expired_at;
  const refreshableUntil = token.refreshable_until;

  // Step 3: Validate ISO 8601 format
  // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ or similar variants
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

  TestValidator.predicate(
    "access token expired_at is ISO 8601 format",
    iso8601Regex.test(expiredAt),
  );

  TestValidator.predicate(
    "refresh token refreshable_until is ISO 8601 format",
    iso8601Regex.test(refreshableUntil),
  );

  // Step 4: Parse timestamps and validate they are valid dates
  const expiredAtDate = new Date(expiredAt);
  const refreshableUntilDate = new Date(refreshableUntil);

  TestValidator.predicate(
    "expired_at is a valid date",
    !isNaN(expiredAtDate.getTime()),
  );

  TestValidator.predicate(
    "refreshable_until is a valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Step 5: Verify refreshable_until > expired_at
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );

  // Step 6: Check token lifespans
  const currentTime = new Date();
  const accessTokenLifespanMs = expiredAtDate.getTime() - currentTime.getTime();
  const refreshTokenLifespanMs =
    refreshableUntilDate.getTime() - currentTime.getTime();

  // Access token should expire in approximately 1 hour (3600 seconds)
  // Allow ±5 minutes tolerance (300 seconds)
  const oneHourMs = 3600 * 1000;
  const accessTokenTolerance = 5 * 60 * 1000; // 5 minutes

  TestValidator.predicate(
    "access token lifespan is approximately 1 hour",
    Math.abs(accessTokenLifespanMs - oneHourMs) < accessTokenTolerance,
  );

  // Refresh token should expire in approximately 7 days (604800 seconds)
  // Allow ±1 hour tolerance (3600 seconds)
  const sevenDaysMs = 7 * 24 * 3600 * 1000;
  const refreshTokenTolerance = 60 * 60 * 1000; // 1 hour

  TestValidator.predicate(
    "refresh token lifespan is approximately 7 days",
    Math.abs(refreshTokenLifespanMs - sevenDaysMs) < refreshTokenTolerance,
  );

  // Step 7: Verify both tokens represent future times
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAtDate.getTime() > currentTime.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntilDate.getTime() > currentTime.getTime(),
  );

  // Step 8: Verify token strings are not empty and of reasonable length
  TestValidator.predicate(
    "access token string is not empty",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token string is not empty",
    token.refresh.length > 0,
  );
}
