import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Validates that refreshed guest tokens contain correct expiration timestamps.
 *
 * This test verifies that when a guest user refreshes their session, the new
 * tokens returned contain properly set expiration timestamps that follow the
 * defined session timeout windows:
 *
 * - Expired_at: Access token expiration time (typically 15 minutes from refresh)
 * - Refreshable_until: Refresh token expiration time (typically 7 days from
 *   refresh)
 *
 * Steps:
 *
 * 1. Register a new guest account to obtain initial tokens
 * 2. Record the initial token response with timestamps
 * 3. Call the refresh endpoint with the refresh token
 * 4. Validate that the new access token expired_at is within expected range (15
 *    minutes)
 * 5. Validate that refreshable_until is within expected range (7 days)
 * 6. Verify timestamps are in valid ISO 8601 date-time format
 * 7. Ensure expired_at is significantly less than refreshable_until
 * 8. Verify the timestamps are reasonable relative to current time
 */
export async function test_api_guest_token_refresh_expiration_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest account to obtain initial tokens
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphabets(12);

  const initialResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: initialEmail,
        password: initialPassword,
      } satisfies ITodoListGuest.ICreate,
    });

  typia.assert(initialResponse);
  typia.assert(initialResponse.token);

  // Step 2: Record the initial token response timestamps and current time
  const beforeRefresh = new Date();
  const initialTokenInfo = initialResponse.token;

  // Step 3: Call the refresh endpoint with the refresh token
  const refreshedResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialTokenInfo.refresh,
      } satisfies ITodoListGuest.IRefresh,
    });

  typia.assert(refreshedResponse);
  typia.assert(refreshedResponse.token);

  const afterRefresh = new Date();
  const refreshedTokenInfo = refreshedResponse.token;

  // Step 4: Validate expired_at timestamp format and reasonableness
  const expiredAtDate = new Date(refreshedTokenInfo.expired_at);
  typia.assert(refreshedTokenInfo.expired_at);

  TestValidator.predicate(
    "expired_at is valid ISO 8601 date-time",
    !isNaN(expiredAtDate.getTime()),
  );

  // Step 5: Validate refreshable_until timestamp format and reasonableness
  const refreshableUntilDate = new Date(refreshedTokenInfo.refreshable_until);
  typia.assert(refreshedTokenInfo.refreshable_until);

  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date-time",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Step 6: Verify expired_at is approximately 15 minutes from refresh time
  const accessTokenExpiration =
    expiredAtDate.getTime() - afterRefresh.getTime();
  const fifteenMinutesMs = 15 * 60 * 1000;
  const twoMinutesMs = 2 * 60 * 1000; // Allow 2 minute tolerance for test execution

  TestValidator.predicate(
    "access token expiration is approximately 15 minutes from refresh",
    accessTokenExpiration > fifteenMinutesMs - twoMinutesMs &&
      accessTokenExpiration < fifteenMinutesMs + twoMinutesMs,
  );

  // Step 7: Verify refreshable_until is approximately 7 days from refresh time
  const refreshTokenExpiration =
    refreshableUntilDate.getTime() - afterRefresh.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const oneHourMs = 60 * 60 * 1000; // Allow 1 hour tolerance for test execution

  TestValidator.predicate(
    "refresh token expiration is approximately 7 days from refresh",
    refreshTokenExpiration > sevenDaysMs - oneHourMs &&
      refreshTokenExpiration < sevenDaysMs + oneHourMs,
  );

  // Step 8: Ensure expired_at is significantly less than refreshable_until
  TestValidator.predicate(
    "access token expires well before refresh token",
    expiredAtDate < refreshableUntilDate,
  );

  // Step 9: Verify expired_at is in the future
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAtDate > afterRefresh,
  );

  // Step 10: Verify refreshable_until is in the future
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntilDate > afterRefresh,
  );

  // Step 11: Verify the new tokens are different from initial tokens
  TestValidator.notEquals(
    "new access token differs from initial access token",
    initialTokenInfo.access,
    refreshedTokenInfo.access,
  );

  TestValidator.notEquals(
    "new refresh token differs from initial refresh token",
    initialTokenInfo.refresh,
    refreshedTokenInfo.refresh,
  );
}
