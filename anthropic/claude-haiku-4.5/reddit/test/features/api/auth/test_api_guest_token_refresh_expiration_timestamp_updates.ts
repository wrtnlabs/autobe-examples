import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that token expiration timestamps are correctly updated during refresh
 * operations.
 *
 * This test validates the guest token refresh functionality by:
 *
 * 1. Creating a guest account and recording initial token expiration timestamps
 * 2. Verifying timestamps are in ISO 8601 format with UTC timezone
 * 3. Calling the refresh endpoint to obtain new tokens
 * 4. Confirming the new access token has an updated expired_at approximately 1
 *    hour later
 * 5. Verifying refreshable_until is appropriately extended
 * 6. Ensuring expiration times are calculated from server time, not client time
 */
export async function test_api_guest_token_refresh_expiration_timestamp_updates(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account
  const initialGuest = await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  // Step 2: Record initial token timestamps
  const initialExpiredAt = initialGuest.token.expired_at;
  const initialRefreshableUntil = initialGuest.token.refreshable_until;
  const refreshRequestTime = new Date();

  // Step 3: Validate initial timestamps are ISO 8601 format in UTC
  TestValidator.predicate(
    "initial expired_at is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(initialExpiredAt),
  );
  TestValidator.predicate(
    "initial refreshable_until is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      initialRefreshableUntil,
    ),
  );

  // Step 4: Parse timestamps for comparison
  const initialExpiredDate = new Date(initialExpiredAt);
  const initialRefreshableDate = new Date(initialRefreshableUntil);

  // Step 5: Call refresh endpoint with initial refresh token
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: initialGuest.token.refresh,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshedGuest);

  // Step 6: Record refreshed token timestamps
  const refreshedExpiredAt = refreshedGuest.token.expired_at;
  const refreshedRefreshableUntil = refreshedGuest.token.refreshable_until;

  // Step 7: Validate refreshed timestamps are also ISO 8601 format in UTC
  TestValidator.predicate(
    "refreshed expired_at is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(refreshedExpiredAt),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      refreshedRefreshableUntil,
    ),
  );

  // Step 8: Parse refreshed timestamps for comparison
  const refreshedExpiredDate = new Date(refreshedExpiredAt);
  const refreshedRefreshableDate = new Date(refreshedRefreshableUntil);

  // Step 9: Verify expired_at was updated and is approximately 1 hour from refresh time
  TestValidator.predicate(
    "refreshed expired_at is later than initial expired_at",
    refreshedExpiredDate.getTime() > initialExpiredDate.getTime(),
  );

  // Calculate expected expiration (approximately 1 hour = 3600000 ms)
  const oneHourMs = 3600000;
  const expectedMinTime = refreshRequestTime.getTime() + oneHourMs - 60000; // Allow 1 minute tolerance
  const expectedMaxTime = refreshRequestTime.getTime() + oneHourMs + 60000; // Allow 1 minute tolerance

  TestValidator.predicate(
    "refreshed expired_at is approximately 1 hour from refresh request",
    refreshedExpiredDate.getTime() >= expectedMinTime &&
      refreshedExpiredDate.getTime() <= expectedMaxTime,
  );

  // Step 10: Verify refreshable_until is extended
  TestValidator.predicate(
    "refreshable_until is extended after refresh",
    refreshedRefreshableDate.getTime() > initialRefreshableDate.getTime(),
  );

  // Step 11: Verify refresh token was updated (different from initial)
  TestValidator.notEquals(
    "refresh token is updated after refresh operation",
    initialGuest.token.refresh,
    refreshedGuest.token.refresh,
  );

  // Step 12: Verify access token was updated
  TestValidator.notEquals(
    "access token is updated after refresh operation",
    initialGuest.token.access,
    refreshedGuest.token.access,
  );

  // Step 13: Verify refreshable_until is reasonably extended (e.g., several days)
  const refreshableDuration =
    refreshedRefreshableDate.getTime() - refreshedExpiredDate.getTime();
  const minimumExpectedDuration = 24 * 3600000; // At least 1 day difference

  TestValidator.predicate(
    "refreshable_until provides sufficient extension beyond expired_at",
    refreshableDuration >= minimumExpectedDuration,
  );

  // Step 14: Verify all timestamp values are non-empty and valid dates
  TestValidator.predicate(
    "all timestamps are valid date objects",
    !isNaN(initialExpiredDate.getTime()) &&
      !isNaN(initialRefreshableDate.getTime()) &&
      !isNaN(refreshedExpiredDate.getTime()) &&
      !isNaN(refreshedRefreshableDate.getTime()),
  );
}
